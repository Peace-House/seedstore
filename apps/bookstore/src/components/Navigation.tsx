
import Navbar from './Navbar'
import MobileNavbar from './MobileNavbar'

const Navigation = ({ children }) => {
    return (
        <div className='bg-[#8FB51C]/15 min-h-screen'>
            <Navbar />
            {children}
            <MobileNavbar />
        </div>
    )
}

export default Navigation