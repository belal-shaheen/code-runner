FROM java:8-jdk-alpine
ARG sessid
ARG main
COPY ./src/Java/src/${sessid}/${main}.java /usr/app/
WORKDIR /usr/app
RUN echo "#!/bin/bash ls" > ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]

