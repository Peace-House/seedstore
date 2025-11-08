import { useLibrary } from '../hooks'
import { useRouter } from 'next/router'
import { useMobile } from '../hooks'
import { MdCheckBox, MdCheckBoxOutlineBlank, MdCheckCircle } from 'react-icons/md'
import clsx from 'clsx'
import { reader } from '../models'
import { useBookstoreLibrary } from '../hooks/remote/useBookstoreLibrary'

const placeholder = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect fill="gray" fill-opacity="0" width="1" height="1"/></svg>`

export default function LibraryPage() {
//   const books = useLibrary()
  const router = useRouter()
  const mobile = useMobile()
    const books = useBookstoreLibrary()


  if (!books) return null

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Library</h1>
      <ul className="grid" style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(calc(80px + 3vw), 1fr))`,
        columnGap: 16,
        rowGap: 24,
      }}>
        {books.map((book: any) => (
          <li key={book.id}>
            <LibraryBookCard book={book} onClick={() => {
              if (mobile) router.push('/')
              reader.addTab(book)
            }} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function LibraryBookCard({ book, onClick }: { book: any, onClick: () => void }) {
  return (
    <div className="relative flex flex-col cursor-pointer" onClick={onClick}>
      <img
        src={book?.cover ?? placeholder}
        alt="Cover"
        className="mx-auto aspect-[9/12] object-cover"
        draggable={false}
      />
      <div className="line-clamp-2 text-on-surface-variant typescale-body-small lg:typescale-body-medium mt-2 w-full" title={book.name}>
        <MdCheckCircle className="mr-1 mb-0.5 inline text-surface-variant" size={16} />
        {book.name}
      </div>
    </div>
  )
}
