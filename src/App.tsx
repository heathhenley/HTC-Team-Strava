import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { ActivityIcon, GithubIcon, ThumbsUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableCaption,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import TeamProgress from "./components/team-progress";
import StravaConnect from "./components/strava-connect";
import PoweredBy from "./components/powered-by";
import { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar";
import { TeamStatsPerMonth } from "shared/types";

const TEAM_GOAL = 3000; // miles

function prettyNumber(num: number, decimals: number): string {
  // print big numbers with k suffix
  if (num > 999) {
    return (num / 1000).toFixed(decimals) + "k";
  }
  return num.toFixed(decimals);
}

const chartConfig = {
  totalDistance: {
    label: "Miles",
    color: "#f97316",
  },
  totalActivities: {
    label: "Activities",
    color: "#fdba74",
  },
} satisfies ChartConfig;

export function TeamStatsBarChart({ data }: { data?: TeamStatsPerMonth[] }) {
  if (!data) return null;
  return (
    <ChartContainer config={chartConfig} className="h-5 min-h-[200px] w-full">
      <BarChart accessibilityLayer data={data}>
        <ChartTooltip
          cursor={{ fillOpacity: 0.3 }}
          content={<ChartTooltipContent className="bg-white/90" />}
        />
        <Bar
          dataKey="totalActivities"
          radius={4}
          fill="var(--color-totalActivities)"
        />
        <Bar
          dataKey="totalDistance"
          radius={4}
          fill="var(--color-totalDistance)"
        />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
      </BarChart>
    </ChartContainer>
  );
}

function Header() {
  const { signOut } = useAuthActions();

  return (
    <header className="flex justify-between w-full border-b-2 p-4 bg-white">
      <div>
        <h1 className="text-lg md:text-2xl">
          Long Distance{" "}
          <span className="text-gray-800 font-semibold">Relay</span>tionship
        </h1>
        <span className="py-2 text-xs md:text-sm">
          <p>Aggregated stats for the HTC 2025 fam </p>
        </span>
      </div>
      <Authenticated>
        <Button
          onClick={() => {
            signOut();
          }}
        >
          Sign Out
        </Button>
      </Authenticated>
    </header>
  );
}

function App() {
  const { signIn } = useAuthActions();
  const allStats = useQuery(api.strava.stats.getAllStats);
  const teamStats = useQuery(api.strava.stats.getTeamStatsPerMonth);

  allStats?.sort((a, b) => b.totalDistance - a.totalDistance);

  return (
    <div className="flex flex-col w-full h-full items-center bg-slate-100">
      <Header />
      <section className="w-full xl:w-3/4 h-full flex flex-col flex-grow md:py-8 px-4 py-4">
        <Authenticated>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col w-full gap-2">
              <TeamProgress
                actualMiles={
                  allStats?.reduce(
                    (acc, stat) => acc + stat.totalDistance,
                    0
                  ) ?? 0
                }
                goalMiles={TEAM_GOAL}
                title="Total Team Miles"
                subTitle={`Chasing ${TEAM_GOAL} miles - started on 10/15/24`}
              />
              <div className="shadow-md rounded-lg p-2 bg-white">
                <TeamStatsBarChart data={teamStats} />
              </div>
            </div>
            <div className="rounded-lg shadow-md p-2 bg-white">
              <div className="text-center text-lg md:text-xl font-bold pt-2">
                The Breakdown
              </div>
              <Table>
                <TableCaption className="text-xs md:text-sm">
                  Overall Stats for the HTC 2025 Team
                </TableCaption>
                <TableHeader>
                  <TableRow className="text-xs md:text-sm">
                    <TableHead></TableHead>
                    <TableHead>Distance (miles)</TableHead>
                    <TableHead>Elevation (ft)</TableHead>
                    <TableHead>Time (hours)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allStats &&
                    allStats.map((stat) => (
                      <TableRow
                        key={stat.user.username}
                        className="text-xs md:text-sm"
                      >
                        <TableCell>
                          <a
                            className=" hover:text-blue-500 flex gap-3"
                            href={`https://www.strava.com/athletes/${stat.user.stravaId}`}
                          >
                            <Avatar>
                              <AvatarImage src={stat.user.profilePicture} />
                              <AvatarFallback className="text-lg font-bold">
                                {stat.user.username[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <div className="font-medium">
                                {stat.user.username}
                              </div>
                              <div className="flex gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div className="text-gray-500 text-xs flex items-center gap-1">
                                        <ActivityIcon className="w-3" />
                                        {stat.totalActivities}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="text-xs">
                                        Total Activities
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div className="text-gray-500 text-xs flex items-center gap-1">
                                        <ThumbsUpIcon className="w-3" />
                                        {stat.totalKudos}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="text-xs">Total Kudos</div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </a>
                        </TableCell>
                        <TableCell>{stat.totalDistance.toFixed(2)}</TableCell>
                        <TableCell>
                          {prettyNumber(stat.totalElevation, 1)}
                        </TableCell>
                        <TableCell>{stat.totalMovingTime.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Authenticated>
        <Unauthenticated>
          <div className="w-full h-3/4 flex flex-col justify-center items-center gap-2 text-center">
            <div>
              <div className="text-lg md:text-2xl">
                Stats for the HTC 2025 team
              </div>
              <div className="text-xs md:text-sm">
                Sign in with Strava and approve read access to your public
                activites.
              </div>
            </div>
            <button className="bg-orange-500" onClick={() => signIn("strava")}>
              <StravaConnect />
            </button>
          </div>
        </Unauthenticated>
      </section>
      <footer className="w-full flex px-6 py-2 justify-between items-center text-center bg-white border-t-2 ">
        <div>
          <p className="text-xs md:text-base">TarpsOff Industries 2024</p>
          <p className="text-xs md:text-sm text-gray-500">Est. 2022 🏃‍♂️</p>
        </div>
        <a href="https://github.com/heathhenley/HTC-Team-Strava">
          {/* switch with new icon */}
          <GithubIcon />
        </a>
        <div className="w-24 md:w-32">
          <PoweredBy />
        </div>
      </footer>
    </div>
  );
}

export default App;
