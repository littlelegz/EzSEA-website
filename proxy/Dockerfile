FROM nginx:1.25
COPY default.conf /etc/nginx/conf.d
COPY nginx.conf /etc/nginx/nginx.conf

RUN mkdir -p /logs && \
    touch /logs/submit_access.csv && \
    chmod 666 /logs/submit_access.csv && \
    chown nginx:nginx /logs