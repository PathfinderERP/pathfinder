import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: ["http://localhost:5173", "http://localhost:5000", "https://pfndrerp.in"],
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("A user connected:", socket.id);

        socket.on("join_room", (room) => {
            socket.join(room);
            console.log(`User jointed room: ${room}`);
        });

        socket.on("leave_room", (room) => {
            socket.leave(room);
            console.log(`User left room: ${room}`);
        });

        socket.on("typing", (data) => {
            socket.to(data.room || "community").emit("user_typing", {
                user: data.user,
                isTyping: true
            });
        });

        socket.on("stop_typing", (data) => {
            socket.to(data.room || "community").emit("user_typing", {
                user: data.user,
                isTyping: false
            });
        });

        socket.on("disconnect", () => {
            console.log("User disconnected");
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        // Fallback for when io is not initialized yet (shouldn't happen in production)
        return {
            emit: () => { },
            to: () => ({ emit: () => { } })
        };
    }
    return io;
};
