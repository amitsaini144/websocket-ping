"use client"
import UserCard from '@/components/userCard';
import { useUser, useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react'
import { useToast } from "@/components/ui/use-toast"
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import { motion } from 'framer-motion';
import LoadingScreen from '@/components/loadingScreen';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function Home() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [latestMessage, setLatestMessage] = useState<string | null>(null);
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<Array<{ id: string, username: string }>>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast()

  useEffect(() => {
    async function connectWebSocket() {
      if (!user) return;

      const token = await getToken();
      const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
      const newSocket = new WebSocket(`${WS_URL}?token=${token}`);

      newSocket.onopen = () => {
        console.log('Connection established');
      }

      newSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          setReceivedMessages(prev => [...prev, data.content]);
          setLatestMessage(data.content);
          toast({
            className: 'text-green-500 text-4xl p-3',
            description: data.content,
          });
        } else if (data.type === 'userList') {
          setConnectedUsers(data.users);
        } else if (data.type === 'userData') {
          setCurrentUser(data.user);
        }
      }

      newSocket.onclose = () => {
        console.log('Connection closed. Attempting to reconnect...');
        setTimeout(connectWebSocket, 5000);
      };

      setSocket(newSocket);
      return () => newSocket.close();
    }

    connectWebSocket();
  }, [user, getToken, toast])

  const handlePing = (targetUser: string, targetUserName: string) => {
    if (socket && currentUser) {
      socket.send(JSON.stringify({
        type: 'ping',
        from: currentUser.id,
        to: targetUser
      }));
      toast({
        className: 'text-4xl p-3',
        description: (
          <span>  
            Ping sent to <span className="text-green-500">{targetUserName}</span>
          </span>
        ),
      });
    }
  }

  const handlePingAll = () => {
    if (socket && currentUser) {
      socket.send(JSON.stringify({
        type: 'pingAll',
        from: currentUser.id
      }));
      toast({
        className: 'text-4xl p-3',
        description: (
          <span>
            Ping sent to <span className="text-green-500">all users</span>
          </span>
        ),
      });
    }
  };

  if (!socket || !currentUser) {
    return (
      <LoadingScreen />
    )
  }

  const otherConnectedUsers = connectedUsers.filter(user => user.id !== currentUser.id);

  return (
    <>
      <div className='flex flex-col min-h-screen bg-black/90'>
        <div>
          <Navbar userName={currentUser.username || 'Unknown'} />
        </div>

        <div className='w-full max-w-4xl mx-auto mt-20 px-4 flex flex-col items-center'>
          {!otherConnectedUsers.length ? (
            <motion.div className="text-white"
              initial={{ opacity: 0, y: 100, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              No other users connected.
            </motion.div>
          ) : (
            <>
              <div className='flex flex-wrap justify-center gap-4 mb-4'>
                {otherConnectedUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    userName={user.username || 'Unknown'}
                    onPing={() => handlePing(user.id, user.username || 'Unknown')}
                  />
                ))}
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              >
                <Button
                  className='bg-red-500 rounded-xl text-white'
                  variant='ghost'
                  onClick={handlePingAll}
                >
                  Send ping to all
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </>
  )
}