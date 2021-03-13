FROM java:8-jdk-alpine
ARG sessid
ARG main
COPY ./src/Java/src/${sessid}/${main}.java /usr/app/
WORKDIR /usr/app
RUN echo "#!/bin/bash \n javac ${main}.java \n java ${main}.class" > ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
ENTRYPOINT ["sh"]
