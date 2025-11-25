FROM nginx:latest

# Copy your static files into NGINX html directory
COPY . /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
