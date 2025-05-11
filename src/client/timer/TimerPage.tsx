// IntervalTrainingStopwatch.tsx
import { createSignal, createEffect, onCleanup, For, Show } from 'solid-js'

interface SubTimer {
  name: string
  duration: number
  completed?: boolean
  inProgress?: boolean
}

export default function IntervalTrainingStopwatch() {
  // Main configuration
  const [getReadyTime, setGetReadyTime] = createSignal<number>(10) // in seconds
  const [globalExerciseTime, setGlobalExerciseTime] = createSignal<number>(30) // in seconds
  const [useGlobalTime, setUseGlobalTime] = createSignal<boolean>(true)
  const [restTime, setRestTime] = createSignal<number>(15) // in seconds between rounds
  const [exerciseRestTime, setExerciseRestTime] = createSignal<number>(5) // in seconds between exercises
  const [rounds, setRounds] = createSignal<number>(3)

  // Sub-timers (named exercises)
  const [subTimers, setSubTimers] = createSignal<SubTimer[]>([
    { name: 'Exercise 1', duration: 30 },
  ])

  // State tracking
  const [currentTime, setCurrentTime] = createSignal<number>(0)
  const [currentRound, setCurrentRound] = createSignal<number>(0)
  const [currentSubTimer, setCurrentSubTimer] = createSignal<number>(0)
  const [phase, setPhase] = createSignal<
    'idle' | 'getReady' | 'run' | 'exerciseRest' | 'roundRest' | 'completed'
  >('idle')
  const [isRunning, setIsRunning] = createSignal<boolean>(false)
  const [isPaused, setIsPaused] = createSignal<boolean>(false)
  const [intervalId, setIntervalId] = createSignal<number | null>(null)

  // Effect to update all exercise durations when global time changes
  createEffect(() => {
    if (useGlobalTime()) {
      const time = globalExerciseTime()
      setSubTimers((prev) =>
        prev.map((timer) => ({ ...timer, duration: time })),
      )
    }
  })

  // Adding a new sub-timer
  const addSubTimer = () => {
    const duration = useGlobalTime() ? globalExerciseTime() : 30
    setSubTimers([
      ...subTimers(),
      { name: `Exercise ${subTimers().length + 1}`, duration },
    ])
  }

  // Removing a sub-timer
  const removeSubTimer = (index: number) => {
    const newTimers = [...subTimers()]
    newTimers.splice(index, 1)
    setSubTimers(newTimers)
  }

  // Updating sub-timer name
  const updateSubTimerName = (index: number, name: string) => {
    const newTimers = [...subTimers()]
    newTimers[index].name = name
    setSubTimers(newTimers)
  }

  // Updating sub-timer duration
  const updateSubTimerDuration = (index: number, duration: number) => {
    const newTimers = [...subTimers()]
    newTimers[index].duration = Number(duration)
    setSubTimers(newTimers)
  }

  // Format time (mm:ss)
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = timeInSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Get current phase display text
  const getCurrentPhaseText = (): string => {
    switch (phase()) {
      case 'idle':
        return 'Ready'
      case 'getReady':
        return 'Get Ready!'
      case 'run':
        return subTimers()[currentSubTimer()]?.name || 'Work'
      case 'exerciseRest':
        return 'Rest Between Exercises'
      case 'roundRest':
        return 'Rest Between Rounds'
      case 'completed':
        return 'Completed!'
      default:
        return ''
    }
  }

  // Calculate total workout time
  const getTotalTime = (): number => {
    const getReadySecs = getReadyTime()
    const exercisesPerRound = subTimers().length
    const totalExerciseTime = subTimers().reduce(
      (acc, timer) => acc + timer.duration,
      0,
    )

    // Exercise rest is after each exercise except the last one in a round
    const exerciseRestsPerRound = Math.max(0, exercisesPerRound - 1)
    const totalExerciseRestTime =
      exerciseRestTime() * exerciseRestsPerRound * rounds()

    // Round rest is after each round except the last one
    const totalRoundRestTime = restTime() * (rounds() - 1)

    return (
      getReadySecs +
      totalExerciseTime * rounds() +
      totalExerciseRestTime +
      totalRoundRestTime
    )
  }

  // Update exercise status
  const updateExerciseStatus = () => {
    setSubTimers((prev) => {
      return prev.map((timer, idx) => {
        const current = currentSubTimer()
        const roundComplete = phase() === 'roundRest' || phase() === 'completed'

        return {
          ...timer,
          completed:
            currentRound() > 1 ||
            (roundComplete && currentRound() === 1) ||
            (currentRound() === 1 && idx < current),
          inProgress: !roundComplete && currentRound() === 1 && idx === current,
        }
      })
    })
  }

  // Timer logic
  const startTimer = () => {
    if (isRunning() || isPaused()) return

    // Reset state
    setCurrentTime(getReadyTime())
    setCurrentRound(1)
    setCurrentSubTimer(0)
    setPhase('getReady')
    setIsRunning(true)
    setIsPaused(false)

    // Reset exercise status
    setSubTimers((prev) =>
      prev.map((timer) => ({ ...timer, completed: false, inProgress: false })),
    )

    const id = setInterval(() => {
      setCurrentTime((time) => {
        if (time <= 1) {
          // Time's up for current phase - determine next phase
          switch (phase()) {
            case 'getReady':
              setPhase('run')
              updateExerciseStatus()
              return subTimers()[0].duration

            case 'run':
              // Check if there are more exercises in this round
              const nextSubTimer = currentSubTimer() + 1
              if (nextSubTimer < subTimers().length) {
                // Move to exercise rest, then next exercise
                setPhase('exerciseRest')
                return exerciseRestTime()
              } else {
                // Finished all exercises in this round
                if (currentRound() < rounds()) {
                  // Move to round rest period
                  setPhase('roundRest')
                  updateExerciseStatus()
                  return restTime()
                } else {
                  // Workout completed
                  setPhase('completed')
                  setIsRunning(false)
                  clearInterval(intervalId()!)
                  // Mark all exercises as completed
                  setSubTimers((prev) =>
                    prev.map((timer) => ({
                      ...timer,
                      completed: true,
                      inProgress: false,
                    })),
                  )
                  return 0
                }
              }

            case 'exerciseRest':
              // After exercise rest, move to next exercise
              setCurrentSubTimer((current) => current + 1)
              setPhase('run')
              updateExerciseStatus()
              return subTimers()[currentSubTimer() + 1].duration

            case 'roundRest':
              // After round rest, start the next round
              setCurrentRound((round) => round + 1)
              setCurrentSubTimer(0)
              setPhase('run')
              updateExerciseStatus()
              return subTimers()[0].duration

            default:
              return 0
          }
        }
        return time - 1
      })

      // Update exercise status on each tick if in run phase
      if (phase() === 'run') {
        updateExerciseStatus()
      }
    }, 1000)

    setIntervalId(id)
  }

  const pauseTimer = () => {
    if (isRunning() && !isPaused()) {
      clearInterval(intervalId()!)
      setIsPaused(true)
    }
  }

  const resumeTimer = () => {
    if (isPaused()) {
      const id = setInterval(() => {
        setCurrentTime((time) => {
          if (time <= 1) {
            // Same logic as in startTimer for transitioning between phases
            switch (phase()) {
              case 'getReady':
                setPhase('run')
                updateExerciseStatus()
                return subTimers()[0].duration

              case 'run':
                const nextSubTimer = currentSubTimer() + 1
                if (nextSubTimer < subTimers().length) {
                  setPhase('exerciseRest')
                  return exerciseRestTime()
                } else {
                  if (currentRound() < rounds()) {
                    setPhase('roundRest')
                    updateExerciseStatus()
                    return restTime()
                  } else {
                    setPhase('completed')
                    setIsRunning(false)
                    clearInterval(intervalId()!)
                    // Mark all exercises as completed
                    setSubTimers((prev) =>
                      prev.map((timer) => ({
                        ...timer,
                        completed: true,
                        inProgress: false,
                      })),
                    )
                    return 0
                  }
                }

              case 'exerciseRest':
                setCurrentSubTimer((current) => current + 1)
                setPhase('run')
                updateExerciseStatus()
                return subTimers()[currentSubTimer() + 1].duration

              case 'roundRest':
                setCurrentRound((round) => round + 1)
                setCurrentSubTimer(0)
                setPhase('run')
                updateExerciseStatus()
                return subTimers()[0].duration

              default:
                return 0
            }
          }
          return time - 1
        })

        // Update exercise status on each tick if in run phase
        if (phase() === 'run') {
          updateExerciseStatus()
        }
      }, 1000)

      setIntervalId(id)
      setIsPaused(false)
    }
  }

  const restartTimer = () => {
    if (isPaused()) {
      clearInterval(intervalId()!)
      setIsRunning(false)
      setIsPaused(false)
      setPhase('idle')
      // Then start again
      startTimer()
    }
  }

  const clearTimer = () => {
    if (!isRunning() || phase() === 'completed') {
      clearInterval(intervalId()!)
      setIsRunning(false)
      setIsPaused(false)
      setPhase('idle')
      setCurrentTime(0)
      setCurrentRound(0)
      setCurrentSubTimer(0)
      // Reset exercise status
      setSubTimers((prev) =>
        prev.map((timer) => ({
          ...timer,
          completed: false,
          inProgress: false,
        })),
      )
    }
  }

  // Clean up interval on component unmount
  onCleanup(() => {
    if (intervalId()) {
      clearInterval(intervalId()!)
    }
  })

  // Background color based on state
  const getBackgroundColor = (): string => {
    if (isRunning() && !isPaused() && phase() !== 'completed') {
      return 'bg-green-100' // Calm green when running
    }
    return 'bg-gray-100' // Neutral when not running
  }

  // Progress calculation (as percentage)
  const calculateProgress = (): number => {
    if (phase() === 'idle' || phase() === 'completed') return 0

    const totalSeconds = getTotalTime()
    let elapsedSeconds = 0

    // Add time based on completed phases
    if (phase() === 'getReady') {
      elapsedSeconds = getReadyTime() - currentTime()
    } else {
      // Get ready phase is complete
      elapsedSeconds = getReadyTime()

      // For each completed round
      const fullRoundExerciseTime = subTimers().reduce(
        (acc, timer) => acc + timer.duration,
        0,
      )
      const exerciseRestsPerRound = Math.max(0, subTimers().length - 1)
      const fullRoundExerciseRestTime =
        exerciseRestTime() * exerciseRestsPerRound

      for (let r = 1; r < currentRound(); r++) {
        // Add exercise time
        elapsedSeconds += fullRoundExerciseTime
        // Add exercise rest time
        elapsedSeconds += fullRoundExerciseRestTime
        // Add round rest time (if not the last round)
        if (r < rounds()) {
          elapsedSeconds += restTime()
        }
      }

      // Add time for current round
      if (phase() === 'run') {
        // Add completed exercises in current round
        for (let i = 0; i < currentSubTimer(); i++) {
          elapsedSeconds += subTimers()[i].duration
          // Add exercise rest after each completed exercise (except the last one)
          if (i < subTimers().length - 1) {
            elapsedSeconds += exerciseRestTime()
          }
        }
        // Add elapsed time in current exercise
        elapsedSeconds +=
          subTimers()[currentSubTimer()].duration - currentTime()
      } else if (phase() === 'exerciseRest') {
        // Add completed exercises in current round
        for (let i = 0; i <= currentSubTimer(); i++) {
          elapsedSeconds += subTimers()[i].duration
        }
        // Add completed exercise rests
        for (let i = 0; i < currentSubTimer(); i++) {
          elapsedSeconds += exerciseRestTime()
        }
        // Add elapsed time in current exercise rest
        elapsedSeconds += exerciseRestTime() - currentTime()
      } else if (phase() === 'roundRest') {
        // All exercises and exercise rests in this round are complete
        elapsedSeconds += fullRoundExerciseTime + fullRoundExerciseRestTime
        // Add elapsed time in current round rest
        elapsedSeconds += restTime() - currentTime()
      }
    }

    return Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100))
  }

  // Calculate progress for a specific exercise
  const calculateExerciseProgress = (index: number): number => {
    if (!isRunning() || phase() !== 'run' || currentSubTimer() !== index) {
      return subTimers()[index].completed ? 100 : 0
    }

    // Current exercise in progress
    const totalTime = subTimers()[index].duration
    const remainingTime = currentTime()
    const elapsedTime = totalTime - remainingTime

    return Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100))
  }

  return (
    <div
      class={`w-full max-w-2xl mx-auto p-4 rounded-lg shadow-md ${getBackgroundColor()}`}
    >
      <h2 class="text-2xl font-bold mb-4 text-center">
        Interval Training Stopwatch
      </h2>

      {/* Timer Display */}
      <div class="mb-6 text-center">
        <div class="text-5xl font-mono font-bold mb-2">
          {formatTime(currentTime())}
        </div>
        <div class="text-xl font-semibold">
          {getCurrentPhaseText()}
          <Show
            when={
              phase() === 'run' ||
              phase() === 'exerciseRest' ||
              phase() === 'roundRest'
            }
          >
            <span class="ml-2">
              (Round {currentRound()}/{rounds()})
            </span>
          </Show>
        </div>

        {/* Overall progress bar */}
        <div class="w-full bg-gray-200 rounded-full h-4 mt-4">
          <div
            class="bg-blue-600 h-4 rounded-full"
            style={{ width: `${calculateProgress()}%` }}
          ></div>
        </div>
        <div class="text-sm text-gray-600 mt-1">Overall Progress</div>
      </div>

      {/* Control buttons */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        <Show
          when={isRunning() && !isPaused()}
          fallback={
            <>
              <Show when={!isRunning() || phase() === 'completed'}>
                <button
                  onClick={startTimer}
                  class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
                >
                  Start
                </button>
                <button
                  onClick={clearTimer}
                  class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
                >
                  Clear
                </button>
              </Show>
              <Show when={isPaused()}>
                <button
                  onClick={resumeTimer}
                  class="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
                >
                  Resume
                </button>
                <button
                  onClick={restartTimer}
                  class="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded"
                >
                  Restart
                </button>
              </Show>
            </>
          }
        >
          <button
            onClick={pauseTimer}
            class="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded"
          >
            Pause
          </button>
        </Show>
      </div>

      {/* Exercise List - visible even when running */}
      <div class="bg-white p-4 rounded-lg shadow-sm mb-6">
        <h3 class="font-bold text-lg mb-2">Exercises</h3>

        <div class="space-y-3">
          <For each={subTimers()}>
            {(timer, index) => (
              <div
                class={`p-2 rounded ${timer.inProgress ? 'bg-green-100' : timer.completed ? 'bg-blue-50' : 'bg-gray-50'}`}
              >
                <div class="flex items-center justify-between mb-1">
                  <span
                    class={`font-medium ${timer.inProgress ? 'text-green-700' : timer.completed ? 'text-blue-700' : ''}`}
                  >
                    {timer.name}
                  </span>
                  <span class="text-sm">{formatTime(timer.duration)}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class={`h-2 rounded-full ${timer.completed ? 'bg-blue-500' : timer.inProgress ? 'bg-green-500' : 'bg-gray-300'}`}
                    style={{ width: `${calculateExerciseProgress(index())}%` }}
                  ></div>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Settings - only editable when not running */}
      <Show when={!isRunning() || isPaused()}>
        <div class="bg-white p-4 rounded-lg shadow-sm mb-6">
          <h3 class="font-bold text-lg mb-2">Timer Settings</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block mb-1 text-sm font-medium">
                Get Ready Time (seconds)
              </label>
              <input
                type="number"
                min="1"
                value={getReadyTime()}
                onInput={(e) => setGetReadyTime(Number(e.target.value))}
                class="w-full px-3 py-2 border rounded"
                disabled={isRunning() && !isPaused()}
              />
            </div>

            <div>
              <label class="block mb-1 text-sm font-medium">
                Rest Between Rounds (seconds)
              </label>
              <input
                type="number"
                min="0"
                value={restTime()}
                onInput={(e) => setRestTime(Number(e.target.value))}
                class="w-full px-3 py-2 border rounded"
                disabled={isRunning() && !isPaused()}
              />
            </div>

            <div>
              <label class="block mb-1 text-sm font-medium">
                Rest Between Exercises (seconds)
              </label>
              <input
                type="number"
                min="0"
                value={exerciseRestTime()}
                onInput={(e) => setExerciseRestTime(Number(e.target.value))}
                class="w-full px-3 py-2 border rounded"
                disabled={isRunning() && !isPaused()}
              />
            </div>

            <div>
              <label class="block mb-1 text-sm font-medium">
                Number of Rounds
              </label>
              <input
                type="number"
                min="1"
                value={rounds()}
                onInput={(e) => setRounds(Number(e.target.value))}
                class="w-full px-3 py-2 border rounded"
                disabled={isRunning() && !isPaused()}
              />
            </div>
          </div>

          {/* Global exercise time setting */}
          <div class="mt-4">
            <div class="flex items-center mb-2">
              <input
                type="checkbox"
                id="useGlobalTime"
                checked={useGlobalTime()}
                onChange={() => setUseGlobalTime(!useGlobalTime())}
                class="mr-2"
                disabled={isRunning() && !isPaused()}
              />
              <label for="useGlobalTime" class="text-sm font-medium">
                Use same duration for all exercises
              </label>
            </div>

            <Show when={useGlobalTime()}>
              <div>
                <label class="block mb-1 text-sm font-medium">
                  Exercise Duration (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  value={globalExerciseTime()}
                  onInput={(e) => setGlobalExerciseTime(Number(e.target.value))}
                  class="w-full px-3 py-2 border rounded"
                  disabled={isRunning() && !isPaused()}
                />
              </div>
            </Show>
          </div>
        </div>

        {/* Sub-timers configuration */}
        <div class="bg-white p-4 rounded-lg shadow-sm">
          <div class="flex justify-between items-center mb-2">
            <h3 class="font-bold text-lg">Exercise Settings</h3>
            <button
              onClick={addSubTimer}
              class="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-sm"
              disabled={isRunning() && !isPaused()}
            >
              Add Exercise
            </button>
          </div>

          <div class="space-y-2">
            <For each={subTimers()}>
              {(timer, index) => (
                <div class="flex flex-wrap items-center gap-2 border p-2 rounded">
                  <div class="flex-grow min-w-0">
                    <label class="block mb-1 text-xs">Exercise Name</label>
                    <input
                      type="text"
                      value={timer.name}
                      onInput={(e) =>
                        updateSubTimerName(index(), e.target.value)
                      }
                      class="w-full px-3 py-2 border rounded"
                      placeholder="Exercise name"
                      disabled={isRunning() && !isPaused()}
                    />
                  </div>

                  <Show when={!useGlobalTime()}>
                    <div class="w-24">
                      <label class="block mb-1 text-xs">Duration (s)</label>
                      <input
                        type="number"
                        min="1"
                        value={timer.duration}
                        onInput={(e) =>
                          updateSubTimerDuration(index(), e.target.value)
                        }
                        class="w-full px-3 py-2 border rounded"
                        placeholder="Seconds"
                        disabled={
                          (isRunning() && !isPaused()) || useGlobalTime()
                        }
                      />
                    </div>
                  </Show>

                  <div class="flex items-end h-full">
                    <button
                      onClick={() => removeSubTimer(index())}
                      class="bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded mt-5"
                      disabled={
                        (isRunning() && !isPaused()) || subTimers().length <= 1
                      }
                    >
                      X
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Total workout time */}
        <div class="mt-4 text-center text-gray-700">
          Total workout time: {formatTime(getTotalTime())}
        </div>
      </Show>
    </div>
  )
}
