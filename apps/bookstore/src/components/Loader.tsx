import Logo from './Logo'

export const Loader = ({withText}:{withText?:boolean}) => {
    return (
        <Logo withText={withText} />
    )
}

export const PageLoader = () => {

    return (
        <div className='grid animate-pulse place-items-center h-full w-full bg-transparent backdrop-blur supports-[backdrop-filter]:bg-transparent'>
            <Logo />
        </div>
    )

}