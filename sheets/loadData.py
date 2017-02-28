#!/usr/bin/env python

import gspread
from oauth2client.service_account import ServiceAccountCredentials
import string
from datetime import datetime
from sqlobject import *
import sys, os
import re
import traceback

parenthetical = re.compile('(.*)\s+\(([^\)]*)\)')
scope = ['https://spreadsheets.google.com/feeds']

credentials = ServiceAccountCredentials.from_json_keyfile_name('/data/solar-system.json', scope)

gc = gspread.authorize(credentials)
sh = gc.open_by_key('1Fiu5q-si5PUvh7ulWwHkQnUoREgYliywZOd7HOftPsU')

db_file = os.path.abspath('/data/solar-system.db')
if os.path.exists(db_file):
    os.unlink(db_file)
connection = connectionForURI('sqlite:' + db_file)
sqlhub.processConnection = connection

class Organisation(SQLObject):
    sheetName = UnicodeCol()
    longName = UnicodeCol(default=None)
    link = UnicodeCol()
Organisation.createTable()

class Dataset(SQLObject):
    organisation = ForeignKey('Organisation')
    title = UnicodeCol()
    frequency = EnumCol(enumValues=['5Y', '4Y', '3Y', '2Y', 'Y', 'Q', 'M', 'W', '2W', '2', '6', 'AH'])
    frequencyNotes = UnicodeCol()
    link = UnicodeCol()
    status = EnumCol(enumValues=['Official Statistics', 'National Statistics', 'Experimental Statistics', 'OpenData'])
    size = IntCol()

Dataset.createTable()

Organisation.sqlmeta.addJoin(MultipleJoin('Dataset', joinMethodName='datasets'))

class Stats(SQLObject):
    name = UnicodeCol()
    geography = UnicodeCol()
    time = UnicodeCol()
    unit = UnicodeCol()
    topics = RelatedJoin('Topic')
    metadata = UnicodeCol()
    form = UnicodeCol()
    dataset = ForeignKey('Dataset')

class Topic(SQLObject):
    label = UnicodeCol()

Stats.createTable()
Topic.createTable()

Dataset.sqlmeta.addJoin(MultipleJoin('Stats', joinMethodName='stats'))

index = sh.worksheet("Index")
index_data = index.get_all_values()
assert index_data[0] == ['Organisation', 'URL']
orgLongName = {}
orgId = {}
for org, url in index_data[1:]:
    persistedOrg = Organisation(sheetName=org, link=url)
    orgId[org] = persistedOrg.id


topicIds = {}
for sheet in sh.worksheets()[2:]:
    print "Sheet: %s" % sheet.title
    data = sheet.get_all_values()
    headers = [header.lower() for header in data[0] if header != '']
    headerCol = {title.lower() : num for num, title in enumerate(data[0]) if title != ''}
    headers = set(headerCol)
    if not set(['producer', 'title', 'frequency', 'status']).issubset(headers):
        print "Unexpected header row in sheet %s: %s" % (sheet.title, string.join(data[0], ', '))
        continue
    dataset = None
    for row in data[1:]:
        producer = row[headerCol['producer']]
        if producer != '':
            if producer != sheet.title:
                    if sheet.title not in orgLongName:
                        orgLongName[sheet.title] = producer
                        if sheet.title not in orgId:
                            persistedOrg = Organisation(sheetName=sheet.title, link=None)
                            orgId[sheet.title] = persistedOrg.id
                            print "'%s' not in index sheet" % sheet.title
                        Organisation.get(orgId[sheet.title]).longName = producer
                    elif orgLongName[sheet.title] != producer:
                        print "Different name for producer, old %s, new %s" % (orgLongName[sheet.title], producer)
            frequency = row[headerCol['frequency']] if 'frequency' in headerCol else None
            frequencyNotes = None
            additionalNotesMatch = parenthetical.match(frequency)
            if (additionalNotesMatch):
                frequency = additionalNotesMatch.group(1)
                frequencyNotes = additionalNotesMatch.group(2)
            sizeString = row[headerCol['size']] if 'size' in headerCol else None
            size = None
            if sizeString:
                if sizeString.endswith('kb'):
                    size = int(float(sizeString[:-2].strip()) * 1024)
                elif sizeString.endswith('MB'):
                    size = int(float(sizeString[:-2].strip()) * 1024 * 1024)
                else:
                    print "Unknown size units for '%s'" % sizeString
            try:
                dataset = Dataset(organisation=orgId[sheet.title],
                                  title=row[headerCol['title']] if 'title' in headerCol else None,
                                  frequency=frequency,
                                  frequencyNotes=frequencyNotes,
                                  link=row[headerCol['link']] if 'link' in headerCol else None,
                                  status=row[headerCol['status']] if 'status' in headerCol else None,
                                  size=size)
            except:
                traceback.print_exc()
                break
        tableName = row[headerCol['name of table']] if 'name of table' in headerCol else None
        if tableName != '' and tableName != None:
            try:
                table = Stats(name=tableName,
                              geography=row[headerCol['geography']] if 'geography' in headerCol else None,
                              time=row[headerCol['time period']] if 'time period' in headerCol else None,
                              unit=row[headerCol['unit of measure']] if 'unit of measure' in headerCol else None,
                              metadata=row[headerCol['metadata']] if 'metadata' in headerCol else None,
                              form=row[headerCol['format']] if 'format' in headerCol else None,
                              dataset=dataset)
                if 'topic dimensions' in headerCol:
                    for topic in row[headerCol['topic dimensions']].split(','):
                        topicLabel = topic.strip().lower()
                        if topicLabel not in topicIds:
                            dbTopic = Topic(label=topicLabel)
                            topicIds[topicLabel] = dbTopic.id
                        else:
                            dbTopic = Topic.get(topicIds[topicLabel])
                        table.addTopic(dbTopic)

            except:
                traceback.print_exc()
