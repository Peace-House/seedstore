import { Link } from "react-router-dom"

const Logo = ({ withText = false }: { withText?: boolean }) => {
    return (

        <Link to="/" className="flex items-center space-x-0">
            <div className="p-2">
                <img src="https://res.cloudinary.com/caresskakka/image/upload/v1764939287/logo_eszpbe.png" alt="" className='h-14 w-[70px]' />
            </div>
            {withText && <span className="font-bold text-xl hidden md:block bg-gradient-to-r from-primary to-[#8FB51C] bg-clip-text text-transparent">SeedStore</span>}
        </Link>
    )
}

export default Logo