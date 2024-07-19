"use client"
import UserCard from '@/components/userCard';
import { useUser, useAuth } from '@clerk/nextjs';
import { useEffect, useState, useRef, useCallback } from 'react'
import { useToast } from "@/components/ui/use-toast"
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import { motion } from 'framer-motion';
import LoadingScreen from '@/components/loadingScreen';
import MessageSection from '@/components/messageSection';

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function Home() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [receivedMessages, setReceivedMessages] = useState<Array<{ content: string, sender: string }>>([]);
  const [messageInput, setMessageInput] = useState('');
  const [connectedUsers, setConnectedUsers] = useState<Array<{ id: string, username: string }>>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [receivedMessages, scrollToBottom]);

  const connectWebSocket = useCallback(async () => {
    if (!user) return;

    const token = await getToken();
    const WS_URL = 'ws://localhost:8080/ws';
    const ws = new WebSocket(`${WS_URL}?token=${token}`);

    ws.onopen = () => {
      console.log('Connection established');
      setSocket(ws);
      socketRef.current = ws;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        setReceivedMessages(prev => [...prev, { content: data.content, sender: data.sender }]);
      } else if (data.type === 'userList') {
        setConnectedUsers(data.users);
      } else if (data.type === 'userData') {
        setCurrentUser(data.user);
      } else if (data.type === 'ping' || data.type === 'pingAll') {
        toast({
          className: 'text-green-500 text-4xl p-3',
          description: data.content,
        });
      }
    };

    ws.onclose = (event) => {
      console.log('Connection closed. Attempting to reconnect...', event.code, event.reason);
      setSocket(null);
      socketRef.current = null;
      setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = (error) => { console.error('WebSocket error:', error); };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [user, getToken, toast]);

  useEffect(() => {
    let cleanupFunction: (() => void) | undefined;

    (async () => {
      if (!socketRef.current) {
        cleanupFunction = await connectWebSocket();
      }
    })();

    return () => {
      if (cleanupFunction) {
        cleanupFunction();
      }
    };
  }, [connectWebSocket]);

  const handlePing = useCallback((targetUser: string, targetUserName: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && currentUser) {
      socketRef.current.send(JSON.stringify({
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
  }, [currentUser, toast]);

  const handlePingAll = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && currentUser) {
      socketRef.current.send(JSON.stringify({
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
  }, [currentUser, toast]);

  const handleSendMessage = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && currentUser && messageInput.trim()) {
      const message = {
        type: 'message',
        content: messageInput.trim(),
        sender: currentUser.username
      };
      socketRef.current.send(JSON.stringify(message));
      setMessageInput('');
    }
  }, [currentUser, messageInput]);

  if (!socket || !currentUser) {
    return <LoadingScreen />;
  }

  const otherConnectedUsers = connectedUsers.filter(user => user.id !== currentUser.id);

  return (
    <>
      <div className='flex flex-col min-h-screen bg-black/90'>
        <Navbar userName={currentUser.username || 'Unknown'} />

        <div className='w-full max-w-4xl mx-auto mt-20 px-4 flex flex-col items-center flex-grow'>
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
                transition={{ duration: 0.5 }}
                className="mb-4"
              >
                <Button
                  className='bg-red-500 rounded-xl text-white'
                  variant='ghost'
                  onClick={handlePingAll}
                >
                  Send ping to all
                </Button>
              </motion.div>

              <MessageSection messagesEndRef={messagesEndRef} recivedMessages={receivedMessages} currentUser={currentUser} />
            </>
          )}
        </div>

        {otherConnectedUsers.length > 0 && (
          <motion.div className='w-full py-4'
            initial={{ opacity: 0, y: 100, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className='max-w-4xl mx-auto px-4 flex items-center'>
              <input
                className='flex-grow mr-2 p-2 rounded-xl focus:outline-none'
                placeholder='Say hi to everyone'
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                maxLength={100}
              />
              <Button className='whitespace-nowrap bg-red-500 text-white rounded-xl' variant='ghost' onClick={handleSendMessage}>
                Send
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </>
  )
}