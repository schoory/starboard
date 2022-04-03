import { useState } from "react"


export const useSocket = () => {

  const [socket, setSocket] = useState(null)

  const rememberSocket = (newSocket) => {
    setSocket(newSocket)
  }

  return { 
    socket, rememberSocket
  }
}