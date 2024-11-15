import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

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

import TeamProgress from "./components/team-progress";
import StravaConnect from "./components/strava-connect";
import PoweredBy from "./components/powered-by";
import { GithubIcon } from "lucide-react";

const TEAM_GOAL = 3000; // miles

function Header() {
  const { signIn, signOut } = useAuthActions();

  return (
    <header className="flex justify-between w-full border-b-2 p-4">
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
      <Unauthenticated>
        <button
          onClick={() => {
            signIn("strava");
          }}
        >
          <StravaConnect />
        </button>
      </Unauthenticated>
    </header>
  );
}

function App() {
  const { signIn } = useAuthActions();
  const allStats = useQuery(api.strava.stats.getAllStats);

  return (
    <div className="flex flex-col h-[100vh] py-2 w-full">
      <Header />
      <section className="w-full h-full flex flex-col md:py-8 px-4">
        <Authenticated>
          <div className="flex flex-col gap-2">
            <TeamProgress
              actualMiles={
                allStats?.reduce((acc, stat) => acc + stat.totalDistance, 0) ??
                0
              }
              goalMiles={TEAM_GOAL}
              title="Total Team Miles"
            />
            <div className="text-center text-lg md:text-xl font-bold pt-2">
              The Breakdown
            </div>
            <Table>
              <TableCaption className="text-xs md:text-sm">
                Overall Stats for the HTC 2025 Team
              </TableCaption>
              <TableHeader>
                <TableRow className="text-xs md:text-sm">
                  <TableHead>Username</TableHead>
                  <TableHead>Distance (miles)</TableHead>
                  <TableHead>Elevation (ft)</TableHead>
                  <TableHead>Time (hours)</TableHead>
                  <TableHead>Activities</TableHead>
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
                          href={`https://www.strava.com/athletes/${stat.user.stravaId}`}
                        >
                          {stat.user.username}
                        </a>
                      </TableCell>
                      <TableCell>{stat.totalDistance.toFixed(2)}</TableCell>
                      <TableCell>{stat.totalElevation.toFixed(0)}</TableCell>
                      <TableCell>{stat.totalMovingTime.toFixed(1)}</TableCell>
                      <TableCell>{stat.totalActivities}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
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
      <footer className="w-full flex px-6 justify-between items-center text-center">
        <div>
          <p>TarpsOff Industries 2024</p>
          <p className="text-sm text-gray-500">Est. 2022 🏃‍♂️</p>
        </div>
        <a href="https://github.com/heathhenley/HTC-Team-Strava">
          {/* switch with new icon */}
          <GithubIcon />
        </a>
        <div className="w-32">
          <PoweredBy />
        </div>
      </footer>
    </div>
  );
}

export default App;
