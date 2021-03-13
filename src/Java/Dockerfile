FROM java:8-jdk-alpine
ARG sessid
ARG mainentry
COPY ./src/Java/src/${sessid}/${mainentry}.java /usr/app/
WORKDIR /usr/app
RUN javac ${mainentry}.java
COPY ${mainentry} main.class
ENTRYPOINT [ "java", "main"]


