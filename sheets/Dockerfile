FROM python:2-alpine
MAINTAINER Alex Tucker <alex@floop.org.uk>

COPY requirements.txt /usr/local/sheets/
RUN \
  apk add --no-cache libffi openssl mariadb-client-libs py-mysqldb bash \
  && apk add --no-cache -t .dev openssl-dev libffi-dev musl-dev linux-headers gcc mariadb-dev \
  && pip install -r /usr/local/sheets/requirements.txt \
  && apk del .dev
COPY loadData.py wait-for-it.sh /usr/local/sheets/
WORKDIR /usr/local/sheets
VOLUME /data
VOLUME /usr/local/sheets
CMD ["python", "loadData.py"]
