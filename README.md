CDN strategy is to create a service that interacts with the API of a CDN network to programmatically update the content served by the CDN. The service will be capable of performing actions such as creating, updating, and deleting cache.

The service will have three endpoints:

/create - creates a new CDN entry by specifying the directory path and content to add in the request body.
/update - updates an existing CDN entry by replacing its content with the new content specified in the request body.
/delete - deletes an existing CDN entry by specifying the directory path in the request body.
