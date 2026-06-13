export function Stepper({ items = [], active, getLabel = (item) => item?.title || item }) {
  return (
    <ol className="stepper" aria-label="Các bước">
      {items.map((item, index) => {
        const key = item?.id || item;
        const isActive = key === active || item === active;
        const activeIndex = items.findIndex((candidate) => (candidate?.id || candidate) === active);
        const isDone = activeIndex > index;

        return (
          <li
            key={key}
            className={`step-item ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
          >
            <span className="step-badge">{index + 1}</span>
            <span className="step-name">{getLabel(item)}</span>
          </li>
        );
      })}
    </ol>
  );
}
