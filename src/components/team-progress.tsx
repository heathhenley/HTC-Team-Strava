import { Progress } from "@/components/ui/progress";

interface TeamProgressProps {
  actualMiles: number;
  goalMiles: number;
  title?: string;
  subTitle?: string;
}

export default function TeamProgress(
  {
    actualMiles,
    goalMiles,
    title = "Team Progress",
    subTitle,
  }: TeamProgressProps = {
    actualMiles: 750,
    goalMiles: 1000,
  }
) {
  const percentage = Math.min(Math.round((actualMiles / goalMiles) * 100), 100);

  return (
    <div className="w-full p-6 bg-white rounded-xl shadow-md space-y-2 md:space-y-4">
      <div>
        <h2 className="text-lg md:text-2xl font-bold text-gray-800 text-center">
          {title}
        </h2>
        {subTitle && (
          <p className="text-center text-xs md:text-sm text-gray-500">{subTitle}</p>
        )}
      </div>
      <div className="md:space-y-2">
        <div className="flex justify-between text-xs md:text-sm font-medium text-gray-600">
          <span>{actualMiles.toFixed(2)} miles</span>
          <span>{goalMiles} miles</span>
        </div>
        <Progress
          value={percentage}
          className="[&>*]:bg-slate-600 bg-slate-200"
        />
        <p className="text-center md:text-lg font-semibold text-gray-700">
          {percentage}% Complete
        </p>
      </div>
      <p className="text-center text-xs md:text-sm text-gray-500">
        {actualMiles.toFixed(2)} out of {goalMiles} miles completed
      </p>
    </div>
  );
}
