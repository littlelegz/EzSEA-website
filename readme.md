This repo contains all the files necessary for running an instance of EzSEA on a gcloud vm. 

Frontend is a reactJS webpage. It contains a customized logo component based on LogoJS and an implementation of molstar as a react component.

Backend is in nodeJS. It receives communications from the frontend and dispatches jobs to kubernetes cluster controlled within the vm. 

Proxy routes communications and logs unique visitors.

Startup on gcloud: 
1. Running frontend and backend
docker-compose up --build