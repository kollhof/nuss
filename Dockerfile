FROM node:5.9
MAINTAINER Jan Klaas Kollhof

ADD ./.babelrc /nuss-src/
ADD ./.eslintrc /nuss-src/
ADD ./.istanbul.yml /nuss-src/
ADD ./package.json /nuss-src/
ADD ./Makefile /nuss-src/
ADD ./nuss /nuss-src/nuss
ADD ./test /nuss-src/test

WORKDIR /nuss-src

RUN npm install;

CMD make ci;
