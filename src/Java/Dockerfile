FROM java:8-jdk-alpine
ARG sessid
COPY ./src/Java/src/${sessid}/main.java /usr/app/
WORKDIR /usr/app
RUN javac main.java
ENTRYPOINT ["java", "main"]


