import { Link } from "react-router-dom"

const Logo = ({ withText = false }: { withText?: boolean }) => {
    return (

        <Link to="/" className="flex items-center space-x-1">
            <div className="p-2">
                <img src="/logo.png" alt="" className='h-10 w-10' />
            </div>
            {withText && <span className="font-bold text-xl hidden md:block bg-gradient-to-r from-primary to-[#8FB51C] bg-clip-text text-transparent">SeedStore</span>}
        </Link>
    )
}

export default Logo