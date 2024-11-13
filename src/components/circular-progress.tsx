"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CircularProgressProps {
  actualMiles: number
  goalMiles: number
  title?: string
}

export default function Component({ actualMiles, goalMiles, title = "Team Progress" }: CircularProgressProps = { actualMiles: 750, goalMiles: 1000 }) {
  const [progress, setProgress] = useState(0)
  const percentage = Math.min(Math.round((actualMiles / goalMiles) * 100), 100)
  
  useEffect(() => {
    const timer = setTimeout(() => setProgress(percentage), 100)
    return () => clearTimeout(timer)
  }, [percentage])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-64 h-64">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle
              className="text-gray-200 stroke-current"
              strokeWidth="10"
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
            ></circle>
            <circle
              className="text-primary stroke-current"
              strokeWidth="10"
              strokeLinecap="round"
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              strokeDasharray={`${progress * 2.51327} 251.327`}
              transform="rotate(-90 50 50)"
            ></circle>
            <text
              x="50"
              y="50"
              className="text-3xl font-bold"
              dominantBaseline="central"
              textAnchor="middle"
            >
              {`${percentage}%`}
            </text>
          </svg>
        </div>
        <div className="mt-4 text-center">
          <p className="text-lg font-semibold">
            {actualMiles} / {goalMiles} miles
          </p>
          <p className="text-sm text-gray-500">
            {goalMiles - actualMiles} miles to go
          </p>
        </div>
      </CardContent>
    </Card>
  )
}