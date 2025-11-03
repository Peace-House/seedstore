import { Card, CardContent, CardFooter } from '../ui/card';
import { truncate } from '@/lib/utils';
import { Book } from '@/services/book';

interface BookPreviewCardProps {
  title?: string;
  author?: string;
  price?: string | number;
  coverFile?: File | null;
  coverImage?: string;
  category?: string;
  description?: string;
}

const BookPreviewCard = ({
  title = 'Book Title',
  author = 'Author',
  price = '',
  coverFile,
  coverImage,
  category,
  description,
}: BookPreviewCardProps) => {
  // Show coverFile preview if available, else coverImage, else fallback
  let coverUrl = '';
  if (coverFile) {
    coverUrl = URL.createObjectURL(coverFile);
  } else if (coverImage) {
    coverUrl = coverImage;
  }
  return (
    <Card className="overflow border-none shadow-none bg-transparent rounded-none hover:shadow-lg transition-shadow group h-max w-[200px]">
      <div className="relative overflow-hidden bg-muted flex-1 w-full h-[220px] flex items-center justify-center">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <span className="text-4xl font-bold text-muted-foreground">
              {title[0]}
            </span>
          </div>
        )}
        {category && (
          <span className="inline-block shadow-lg text-xs px-2 py-1 bg-white/60 text-primary rounded-full absolute right-1 top-1 z-10">
            {category}
          </span>
        )}
      </div>
      <div className='h-max-[150px] flex flex-col justify-between'>
        <CardContent className="p-2 bg-none">
          <h3 className="text-xs font-semibold line-clamp-2 mb-1">{truncate(title, 21)}</h3>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground capitalize">{author}</p>
          </div>
        </CardContent>
        <CardFooter className="p-2 bg-none pt-0 flex items-center justify-between">
          <span className="text-sm font-bold text-primary">
            {price ? (Number(price) === 0 ? 'Free' : `₦${Number(price).toLocaleString()}`) : ''}
          </span>
        </CardFooter>
      </div>
    </Card>
  );
};

export default BookPreviewCard;