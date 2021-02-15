FROM python:3

ARG sessid
COPY ./src/Python/src/${sessid}/main.py /usr/app/
WORKDIR /usr/app

ENTRYPOINT [ "python", "main.py" ]
