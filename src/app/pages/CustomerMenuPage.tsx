import { useParams } from 'react-router';
import { CustomerMenu } from '@/app/components/CustomerMenu';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';

export default function CustomerMenuPage() {
  const { slug } = useParams<{ slug?: string }>();
  return (
    <ErrorBoundary>
      <div className="size-full">
        <CustomerMenu slug={slug} />
      </div>
    </ErrorBoundary>
  );
}
