## NodeJS based project using WebRTC SFU & Websockets - StickPM

## Server-Side Logic

### Initialization and Configuration
The server initializes the Express application, loads environment variables from a `.env` file, and configures middleware for request parsing, logging, and security. This setup ensures that the server can handle incoming requests efficiently and securely.

### Routing and WebSocket Setup
The server sets up routes for handling various HTTP requests, including rendering views, user management, room operations, and message handling. Additionally, it initializes a WebSocket server using Socket.io to manage real-time communication between clients. The server then starts HTTP and HTTPS servers to listen for incoming connections.

### User Management
The server handles user-related operations such as adding, updating, deleting users, managing user roles and authentication. It ensures secure handling of user data and enforces role-based access control to restrict functionalities based on user roles.

### Room Management
The server manages chat rooms, including creating, updating, deleting rooms, and handling room settings. It allows users to join and leave rooms, ensuring that the room's state is maintained accurately.

### Message Handling
The server is responsible for sending, receiving, and archiving messages. It includes sentiment analysis of messages to gauge the tone of conversations and handles reactions to messages, allowing users to interact with messages through emojis and other reactions.

### Stream Management
The server manages live video streams using WebRTC. It handles the start and end of streaming sessions, manages peer connections, and tracks active streams in each room. It also handles user interactions during streams, such as following and unfollowing streams, and starting and stopping recordings.

### Polls and Reactions
The server supports creating and managing polls within the chat rooms. It handles voting in polls, retrieving poll results, and ensures unique random values for polls. Users can also add reactions to messages, which are processed and stored by the server.

### Security
The server implements security features such as rate limiting to prevent abuse, two-factor authentication (2FA) for enhanced security, and tracks user activities to save analytics. It logs events and errors for monitoring and debugging purposes.

### Data Loading and Caching
The server loads data from JSON files into memory to ensure efficient access to user, room, and message data. This approach allows for quick data retrieval and updates, enhancing the overall performance of the application.

### Middleware
The server includes middleware functions for authentication, logging, and error handling. These functions process incoming requests before they reach the main logic, ensuring that only authenticated users can access certain routes, logging all incoming requests for monitoring, and capturing any errors that occur during request processing.

### Miscellaneous Utilities
The server includes various utility functions for sending notifications to users, analyzing the sentiment of messages, and logging events and errors. These utilities support the main functionalities of the application by providing essential services.

### Exported Functions and Parameters
The server exports numerous functions to handle specific operations such as adding users to rooms, starting and ending streams, archiving messages, creating polls, and managing user roles. Key parameters include `roomId` and `userId` for identifying rooms and users, as well as `message`, `poll`, and `stream` for handling respective data.

## Client-Side Logic (chat.ejs)

### Interface Components
- **Chat Room**: The main interface for real-time communication, displaying chat messages, user interactions, and video streams.
- **User List**: Displays currently connected users, updating dynamically as users join or leave.
- **Message Input**: Allows users to type and send messages with a contenteditable div for user-friendly input.
- **Video and Stream Controls**: Manages local and remote video streams, offering controls like view, mute, settings, and exit.
- **Settings Panel**: Provides user settings for theme, font size, and notifications, enhancing user customization.

### JavaScript Functionalities
- **WebSocket Connection**: Establishes a WebSocket connection to the server for real-time communication using Socket.io.
- **Event Handling**: Listens for various events such as messages, user join/leave, polls, streams, and reactions, updating the UI accordingly.
- **Send Messages**: Emits messages to the server for broadcasting to the room and updates the chat interface.
- **User and Stream Management**: Handles users joining/leaving rooms and starting/ending streams, including push-to-talk for microphone control.
- **Push-to-Talk**: Allows users to activate the microphone only when needed, improving communication efficiency.
- **Dynamic Updates**: Updates the user list and stream management in real-time, ensuring the UI reflects the current state.

### Key Operations
- **Join Room**: Emits `joinRoom` event with room ID and username to join a chat room.
- **Send Message**: Emits `sendMessage` event with room ID and message to send a chat message.
- **Broadcasting and Streaming**: Manages starting and stopping live video streams, handling local and remote video streams dynamically.
- **Event Handling**: Updates the user list when users join or leave the room, displays chat messages in real-time, shows typing indicators, and handles polls and stream management.
  
## Detailed Functionality Reports

### Server-Side
- **User Management**: Create, update, delete users, manage user roles and authentication.
- **Room Management**: Create, update, delete chat rooms, manage room settings and user permissions.
- **Message Handling**: Send, receive, and archive messages, analyze message sentiment, handle reactions.
- **Stream Management**: Start and end streams using WebRTC, manage streaming sessions and viewer interactions.
- **Polls and Reactions**: Create and manage polls, handle voting, and display poll results.
- **Security**: Implement rate limiting, two-factor authentication, and track user activities to save analytics.

### Client-Side
- **Real-Time Communication**: Send and receive messages instantly, display user activities and interactions.
- **User Interface**: Responsive and interactive UI components, user-friendly controls for chat and video streams.
- **Media Handling**: Select and manage media devices for video and audio, implement push-to-talk for efficient communication.
- **Dynamic Updates**: Real-time updates for user list and streamers, notifications for user actions and events.

##Context email: contact.stickpm@gmail.com
