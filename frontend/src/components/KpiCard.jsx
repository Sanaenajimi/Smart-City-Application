export default function KpiCard({ title, value, sub, Icon, iconTone = "text-gray-500" }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
      <div>
        <div className="text-xs text-gray-500">{title}</div>
        <div className="text-lg font-semibold mt-1">{value}</div>
        {sub ? <div className="text-xs text-gray-500 mt-1">{sub}</div> : null}
      </div>
      {Icon ? (
        <div className={"h-9 w-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center " + iconTone}>
          <Icon size={18} />
        </div>
      ) : null}
    </div>
  );
}
