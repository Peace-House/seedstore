import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'

const ProtectedRoutes = ({children}) => {
    const {token} = useAuth()

    useEffect(() => {
      if(!token){
        <Navigate to={'/'} />
      }
    }, [token])
    
  return (
    <div>{children}</div>
  )
}

export default ProtectedRoutes