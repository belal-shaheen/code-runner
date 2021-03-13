FROM java:8-jdk-alpine
ARG sessid
ARG mainentry
COPY ./src/Java/src/${sessid}/${mainentry}.java /usr/app/
WORKDIR /usr/app
RUN echo "#!/bin/bash \n javac ${main}.java \n java ${main}" > ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]


