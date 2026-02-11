import "./SkeletonCards.css";

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-img skeleton-shimmer" />
    <div className="skeleton-body">
      <div className="skeleton-title skeleton-shimmer" />
      <div className="skeleton-tag skeleton-shimmer" />
      <div className="skeleton-line skeleton-shimmer" />
      <div className="skeleton-line skeleton-line--short skeleton-shimmer" />
      <div className="skeleton-line skeleton-shimmer" />
      <div className="skeleton-btn skeleton-shimmer" />
    </div>
  </div>
);

// eslint-disable-next-line react/prop-types
const SkeletonCards = ({ count = 6, title }) => (
  <div className="skeleton-wrapper">
    {title && <div className="skeleton-header skeleton-shimmer" />}
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <SkeletonCard key={`sk-${i}`} />
      ))}
    </div>
  </div>
);

export default SkeletonCards;
