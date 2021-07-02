FROM java:8-jdk-alpine
ARG sessid
ARG main
ENV main=${main}
COPY ./src/Java/src/${sessid}/${main}.java /usr/app/
WORKDIR /usr/app
RUN javac -verbose ${main}.java
ENTRYPOINT java ${main}
