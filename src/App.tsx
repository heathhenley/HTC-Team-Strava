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

const TEAM_GOAL = 3000;

function App() {
  const { signIn, signOut } = useAuthActions();
  const allStats = useQuery(api.strava.stats.getAllStats);

  return (
    <div className="flex flex-col h-[100vh] p-6 w-full">
      <header className="flex justify-between w-full">
        <div>
          <h1 className="text-2xl">
            Long Distance <span className="text-gray-800 font-semibold">Relay</span>tionship
          </h1>
          <span className="py-2 text-sm">
            <p>Aggregated stats for the HTC 2025 team (and friends)</p>
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
          <Button
            onClick={() => {
              signIn("strava");
            }}
          >
            Sign In
          </Button>
        </Unauthenticated>
      </header>
      <section className="w-full h-full flex flex-col py-8">
        <Authenticated>
          <div className="flex flex-col gap-16">
            <TeamProgress
              actualMiles={
                allStats?.reduce((acc, stat) => acc + stat.totalDistance, 0) ??
                0
              }
              goalMiles={TEAM_GOAL}
              title="Total Team Miles"
            />
            <Table>
              <TableCaption>Overall Stats for the HTC 2025 Team</TableCaption>
              <TableHeader>
                <TableRow>
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
                    <TableRow key={stat.username}>
                      <TableCell>{stat.username}</TableCell>
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
          <p>Sign in with strave to view the teams stats</p>
        </Unauthenticated>
      </section>
      <footer className="w-full flex-col justify-center items-center text-center">
        <p>TarpsOff Industries © 2024</p>
        <p className="text-sm text-gray-500">Est. 2022 - All rights reserved</p>
      </footer>
    </div>
  );
}

export default App;
