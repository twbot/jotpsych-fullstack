# Notes
SETUP INSTRUCTIONS IN README HAVE BEEN UPDATED
I wanted to be able to do as much as possible in 2 hours, so I decided the best option was have an LLM produce the code for the basic tasks so I could work on more exciting tasks, like using OpenAI's Whisper for audio transcription. At the end, I actually didn't end up with that much time after fixing bugs, but I did get something going on the transcription part.

1. To begin, I [repopacked](https://www.genome.gov/) the `src/` folder by running this command `repopack --ignore "backend/instance/,backend/venv/,frontend/node_modules,frontend/package-lock.json"`. This resultant .txt file will be used as context for Claude. The ignore flag removes any unnecessary information related to the functionality of the website in order to reduce the number of tokens so I don't reach my limit quicker.
2. I then prompted Claude to go through the README file in the uploaded .txt file and go through the *Tasks* section and complete each task one-by-one. I additionally provided these instructions:

    >You are an expert in full-stack web development. 
    >Your response should adhere to the following guidelines:
    >The code should be fully functional and can be executed without any modifications.
    >Include all necessary code, including any required import statements, function definitions, and main execution block.
    >Avoid using placeholder comments or pseudo code. The code should be complete and ready to run.
    >Provide clear and concise comments to explain complex or non-obvious parts of the code.
    >Use proper indentation, formatting, and naming conventions consistent with the best practices of the programming language.
    >Test the code thoroughly to ensure it produces the expected output and handles potential edge cases.
    >Optimize the code for readability, efficiency, and maintainability.
    >Please provide only the code in your response, without any additional explanations or discussions.
3. Copied and pasted the code in their necessary files.
4. Changed the styling to better match the color scheme of jotpsych while also incorporating some glassmorphism design elements.
5. Tested to ensure each task was accomplished, and if not, modified the code to make it work as expected. There were a quite a few blocks of code that needed to be modified, but overall I was pretty impressed with the output. Usually to find an issue, I test from the top down. I start with the application layer, determine if there exists any issues with UI function handlers, any errors in the console etc. From there, I work my way to the backend, ensuring I have proper error handling in place so I can view what the error could be, and if I am unsure of the error, simply look up the issue or give context to an LLM using repopack and provide the error message.

# Planning for Production

## Scaling
- Implement multiple application servers behind a load balancer (e.g., NGINX) for even distribution of traffic and failover
- Use Kubernetes for scaling Flask, Redis, and Celery workers across multiple nodes
## Security
- Store audio files in AWS S3 with access control using signed URLs
- Implement API rate limiting using NGINX
- Secure message queue communication (Redis) with encryption and authentication
## Performance
- Use Redis for caching frequent queries (user profiles, transcriptions)
- Use WebSockets to notify clients when transcription tasks are complete, or even open a secure websocket for real-time transcription
- Implement CDN for static assets on the frontend
## Monitoring/Logging
- Use Datadog for application monitoring
- Use ELK Stack for log aggregation and analysis
## Deployment
- Use Docker to containerize the frontend (React), backend (Flask), Celery, and Redis services
- Use Kubernetes to manage container scaling, deployment, and health checks
- Implement automated builds, tests, and deployment via GitLab CI
- Terraform/Ansible for AWS provisioning/configuration
- Maintain separate environments for development, staging, and production

# What I would like to finish
I would've liked to continue with the transcription process and make it real-time. Instead of using the endpoint, build out the infrastructure to use the model directly, and stream the data.
- Instead of processing entire audio files, deal with continuous streams. The WebSocket servers receive audio chunks and forward them for processing.
- Use Redis Pub/Sub to decouple the audio reception from the transcription process.
- Use a machine for the transcription worker that has a GPU in order to decrease processing time.
