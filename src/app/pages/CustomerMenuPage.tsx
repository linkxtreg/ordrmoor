import { useParams } from 'react-router';
import { CustomerMenu } from '@/app/components/CustomerMenu';

export default function CustomerMenuPage() {
  const { slug } = useParams<{ slug?: string }>();
  return (
    <div className="size-full">
      <CustomerMenu slug={slug} />
    </div>
  );
}
