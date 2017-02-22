FROM python:2-alpine
MAINTAINER Alex Tucker <alex@floop.org.uk>

COPY requirements.txt /usr/local/sheets/
RUN \
  apk add --no-cache -t .dev openssl-dev libffi-dev musl-dev linux-headers gcc \
  && apk add --no-cache libffi openssl \
  && pip install -r /usr/local/sheets/requirements.txt \
  && apk del .dev
COPY loadData.py /usr/local/sheets/
WORKDIR /usr/local/sheets
VOLUME /data
VOLUME /usr/local/sheets
CMD ["python", "loadData.py"]