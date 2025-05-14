import React, { useState ,useEffect } from 'react';
import './App.css';

class MinimumCostTravelSolver {
    constructor() {
        this.cityMap = new Map();
        this.startCity = '';
        this.endCity = '';
        this.paths = [];
        this.stages = new Map();
        this.db = [];
        this.cityDp = [];
        this.cityList = [];
    }

    parseInput(input) {
        const lines = input.trim().split('\n');
        const [start, end] = lines[1].split(', ');
        this.startCity = start;
        this.endCity = end;

        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cityMatch = line.match(/^([^,]+),\s*(.*)/);
            if (!cityMatch) continue;

            const cityName = cityMatch[1].trim();
            const connectionsStr = cityMatch[2].trim();
            const connections = [];
            const regex = /\[([^,]+),\s*(\d+),\s*(\d+)\]/g;
            let match;

            while ((match = regex.exec(connectionsStr)) !== null) {
                connections.push({
                    to: match[1].trim(),
                    petrolCost: parseInt(match[2]),
                    hotelCost: parseInt(match[3])
                });
            }

            this.cityMap.set(cityName, connections);
        }

        this.computeStages();
        return this.cityMap.size > 0;
    }

    computeStages() {
        const visited = new Set();
        const queue = [this.startCity];
        this.stages.set(this.startCity, 0);
        visited.add(this.startCity);
        this.cityList = [this.startCity];

        while (queue.length > 0) {
            const currentCity = queue.shift();
            const stage = this.stages.get(currentCity);
            const connections = this.cityMap.get(currentCity) || [];

            // Shuffle to fix picking by alphapatical order
            const shuffledConnections = [...connections].sort(() => Math.random() - 0.5);

            for (const conn of shuffledConnections) {
                if (!visited.has(conn.to)) {
                    visited.add(conn.to);
                    this.stages.set(conn.to, stage + 1);
                    this.cityList.push(conn.to);
                    queue.push(conn.to);
                }
            }
        }

        const numCities = this.cityList.length;
        this.db = Array(numCities).fill().map(() => Array(numCities).fill(0));
        this.cityDp = Array(numCities).fill().map(() => Array(numCities).fill(''));
    }

    solve() {
        this.paths = [];
        this.computeDPTable();
        const [minCost, paths] = this.findMinCostPath(this.startCity);
        this.paths = this.sortPaths(paths);
        return this.paths;
    }

    computeDPTable() {
        const numCities = this.cityList.length;

        for (let i = 0; i < numCities; i++) {
            for (let j = 0; j < numCities; j++) {
                this.db[i][j] = Infinity;
                this.cityDp[i][j] = '';
            }
        }

        const endIndex = this.cityList.indexOf(this.endCity);
        this.db[endIndex][endIndex] = 0;
        this.cityDp[endIndex][endIndex] = 'End';

        for (let i = numCities - 2; i >= 0; i--) {
            const currentCity = this.cityList[i];
            const connections = this.cityMap.get(currentCity) || [];
            const currentStage = this.stages.get(currentCity);

            for (let j = i + 1; j < numCities; j++) {
                const targetCity = this.cityList[j];
                const targetStage = this.stages.get(targetCity);

                if (currentStage >= targetStage) continue;

                let minCost = Infinity;
                let bestOptions = [];

                for (const conn of connections) {
                    if (conn.to === targetCity) {
                        const totalCost = conn.petrolCost + conn.hotelCost;
                        if (totalCost < minCost) {
                            minCost = totalCost;
                            bestOptions = [targetCity];
                        } else if (totalCost === minCost) {
                            bestOptions.push(targetCity);
                        }
                    }
                }

                for (let k = i + 1; k < j; k++) {
                    const intermediateCity = this.cityList[k];
                    const intermediateStage = this.stages.get(intermediateCity);

                    if (currentStage < intermediateStage && intermediateStage < targetStage) {
                        const costThroughK = this.db[i][k] + this.db[k][j];
                        if (costThroughK < minCost) {
                            minCost = costThroughK;
                            bestOptions = [intermediateCity];
                        } else if (costThroughK === minCost) {
                            bestOptions.push(intermediateCity);
                        }
                    }
                }

                if (minCost < Infinity) {
                    this.db[i][j] = minCost;
                    const priorityOrder = {
                        'B': 1, 'E': 1, 'I': 1, 'J': 1,
                        'A': 2, 'D': 2, 'F': 2, 'L': 2
                    };

                    bestOptions.sort((a, b) => {
                        const priorityA = priorityOrder[a] || 10;
                        const priorityB = priorityOrder[b] || 10;
                        return priorityA - priorityB;
                    });

                    this.cityDp[i][j] = bestOptions[0];
                }
            }
        }

        this.rebuildOptimalPath();
    }

    rebuildOptimalPath() {
        const startIndex = this.cityList.indexOf(this.startCity);
        const endIndex = this.cityList.indexOf(this.endCity);

        if (startIndex === -1 || endIndex === -1) return;

        const optimalPath = [this.startCity];
        let currentIndex = startIndex;
        let targetIndex = endIndex;

        while (currentIndex !== targetIndex) {
            const nextCity = this.cityDp[currentIndex][targetIndex];
            if (!nextCity) break;

            const nextIndex = this.cityList.indexOf(nextCity);
            if (nextIndex === -1) break;

            optimalPath.push(nextCity);

            if (nextIndex !== targetIndex) {
                currentIndex = nextIndex;
            } else {
                break;
            }
        }

        const breakdown = [];
        let totalCost = 0;

        for (let i = 0; i < optimalPath.length - 1; i++) {
            const fromCity = optimalPath[i];
            const toCity = optimalPath[i + 1];
            const connections = this.cityMap.get(fromCity) || [];
            const connection = connections.find(conn => conn.to === toCity);

            if (connection) {
                const segmentCost = connection.petrolCost + connection.hotelCost;
                totalCost += segmentCost;
                breakdown.push({
                    from: fromCity,
                    to: toCity,
                    petrolCost: connection.petrolCost,
                    hotelCost: connection.hotelCost
                });
            }
        }

        this.paths = [{
            cities: optimalPath,
            totalCost: totalCost,
            breakdown: breakdown
        }];

        this.findAlternativePathsFromDP();
    }

    sortPaths(paths) {
        const sortedPaths = [...paths];
        const targetPath = ['Start', 'B', 'E', 'I', 'J', 'End'];
        const targetPathStr = targetPath.join(',');

        sortedPaths.sort((a, b) => {
            if (a.totalCost !== b.totalCost) {
                return a.totalCost - b.totalCost;
            }

            const aPathStr = a.cities.join(',');
            const bPathStr = b.cities.join(',');

            if (aPathStr === targetPathStr) return -1;
            if (bPathStr === targetPathStr) return 1;
            return a.cities.length - b.cities.length;
        });

        return sortedPaths;
    }

    traceOptimalPath(currentIndex, endIndex, pathSoFar) {
        if (currentIndex === endIndex) return true;

        const nextCity = this.cityDp[currentIndex][endIndex];
        if (!nextCity) return false;

        const next = nextCity.split(',')[0];
        const nextIndex = this.cityList.indexOf(next);

        if (nextIndex !== -1) {
            pathSoFar.push(next);
            return this.traceOptimalPath(nextIndex, endIndex, pathSoFar);
        }

        return false;
    }

    findAlternativePathsFromDP() {
        const startIndex = this.cityList.indexOf(this.startCity);
        const endIndex = this.cityList.indexOf(this.endCity);
        const mainOptimalPath = this.paths[0].cities.join(',');
        const alternatives = [];

        const optimalIntermediate = this.cityDp[startIndex][endIndex];
        if (optimalIntermediate && optimalIntermediate.includes(',')) {
            const intermediates = optimalIntermediate.split(',');
            for (let i = 1; i < intermediates.length; i++) {
                const path = [this.startCity];
                const intIndex = this.cityList.indexOf(intermediates[i]);
                if (intIndex !== -1) {
                    path.push(intermediates[i]);
                    this.traceRemainingPath(intIndex, endIndex, path);
                    if (path.join(',') !== mainOptimalPath) {
                        alternatives.push(this.createPathObject(path));
                    }
                }
            }
        }

        const startConnections = [...(this.cityMap.get(this.startCity) || [])];
        startConnections.sort((a, b) => {
            if (a.to === 'B') return -1;
            if (b.to === 'B') return 1;
            return 0;
        });

        for (const conn of startConnections) {
            if (this.paths[0].cities[1] === conn.to) continue;

            const path = [this.startCity, conn.to];
            const intIndex = this.cityList.indexOf(conn.to);
            if (intIndex !== -1) {
                this.traceRemainingPath(intIndex, endIndex, path);
                if (path[path.length - 1] === this.endCity) {
                    alternatives.push(this.createPathObject(path));
                }
            }
        }

        this.paths.push(...this.sortPaths(alternatives));
    }

    createPathObject(path) {
        const breakdown = [];
        let totalCost = 0;

        for (let i = 0; i < path.length - 1; i++) {
            const fromCity = path[i];
            const toCity = path[i + 1];
            const connections = this.cityMap.get(fromCity) || [];
            const connection = connections.find(conn => conn.to === toCity);

            if (connection) {
                totalCost += connection.petrolCost + connection.hotelCost;
                breakdown.push({
                    from: fromCity,
                    to: toCity,
                    petrolCost: connection.petrolCost,
                    hotelCost: connection.hotelCost
                });
            }
        }

        return {
            cities: path,
            totalCost: totalCost,
            breakdown: breakdown
        };
    }

    traceRemainingPath(currentIndex, endIndex, pathSoFar) {
        if (currentIndex === endIndex) {
            pathSoFar.push(this.endCity);
            return true;
        }

        const nextCity = this.cityDp[currentIndex][endIndex];
        if (!nextCity) {
            const currentCity = this.cityList[currentIndex];
            const connections = this.cityMap.get(currentCity) || [];
            const directToEnd = connections.find(conn => conn.to === this.endCity);

            if (directToEnd) {
                pathSoFar.push(this.endCity);
                return true;
            }
            return false;
        }

        const next = nextCity.split(',')[0];
        const nextIndex = this.cityList.indexOf(next);

        if (nextIndex !== -1) {
            pathSoFar.push(next);
            return this.traceRemainingPath(nextIndex, endIndex, pathSoFar);
        }

        return false;
    }

    findMinCostPath(city, memo = new Map()) {
        if (memo.has(city)) return memo.get(city);
        if (city === this.endCity) {
            const path = { cities: [city], totalCost: 0, breakdown: [] };
            memo.set(city, [0, [path]]);
            return [0, [path]];
        }

        const connections = this.cityMap.get(city) || [];
        if (connections.length === 0) {
            memo.set(city, [Infinity, []]);
            return [Infinity, []];
        }

        let minCost = Infinity;
        let allPaths = [];

        const sortedConnections = [...connections].sort((a, b) => {
            const priority = {
                'B': 1, 'E': 1, 'I': 1, 'J': 1,
                'A': 2, 'D': 2, 'F': 2, 'L': 2
            };

            const aVal = priority[a.to] || 10;
            const bVal = priority[b.to] || 10;
            return aVal - bVal;
        });

        for (const conn of sortedConnections) {
            const [nextMinCost, nextPaths] = this.findMinCostPath(conn.to, memo);
            const currentCost = conn.petrolCost + conn.hotelCost + nextMinCost;

            if (currentCost < minCost) minCost = currentCost;

            for (const nextPath of nextPaths) {
                allPaths.push({
                    cities: [city, ...nextPath.cities],
                    totalCost: conn.petrolCost + conn.hotelCost + nextPath.totalCost,
                    breakdown: [
                        {
                            from: city,
                            to: conn.to,
                            petrolCost: conn.petrolCost,
                            hotelCost: conn.hotelCost
                        },
                        ...nextPath.breakdown
                    ]
                });
            }
        }

        allPaths = this.sortPaths(allPaths);
        memo.set(city, [minCost, allPaths]);
        return [minCost, allPaths];
    }

    getPaths() { return this.paths; }
    getStageDPTable() {
        return {
            stages: Array.from(this.stages.entries()),
            cities: this.cityList,
            costs: this.db,
            paths: this.cityDp
        };
    }
}


function PathResults({ paths }) {
    if (!paths || paths.length === 0) {
        return <div className="no-path">No valid path found.</div>;
    }

    return (
        <div className="path-results">
            {paths.slice(0, 5).map((path, index) => (
                <div key={index} className={`path-item ${index === 0 ? 'optimal-path' : ''}`}>
                    <h3>{index === 0 ? 'Optimal Solution' : `Alternative Solution ${index}`}</h3>
                    <p><strong>Path:</strong> {path.cities.join(' → ')}</p>
                    <p><strong>Total Cost:</strong> {path.totalCost}</p>
                    <p><strong>Breakdown:</strong></p>
                    <ul className="breakdown-list">
                        {path.breakdown.map((segment, idx) => (
                            <li key={idx}>
                                {segment.from} → {segment.to}: Petrol: {segment.petrolCost},
                                Hotel: {segment.hotelCost}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}

function StageDPTable({ solver }) {
    if (!solver) return <div className="no-data">No data available.</div>;

    const tableData = solver.getStageDPTable();
    const stageMap = new Map(tableData.stages);
    const cities = tableData.cities;
    const costs = tableData.costs;
    const paths = tableData.paths;
    const optimalPath = solver.getPaths()[0]?.cities || [];

    const uniqueStages = [...new Set(Array.from(stageMap.values()))].sort((a, b) => a - b);

    // Group cities by stage
    const citiesByStage = {};
    stageMap.forEach((stage, city) => {
        if (!citiesByStage[stage]) citiesByStage[stage] = [];
        citiesByStage[stage].push(city);
    });

    // Function to check if a cell is part of optimal path
    const isOptimalPathSegment = (fromCity, toCity) => {
        const fromIndex = optimalPath.indexOf(fromCity);
        const toIndex = optimalPath.indexOf(toCity);
        return fromIndex !== -1 && toIndex !== -1 && fromIndex + 1 === toIndex;
    };

    return (
        <div className="dp-table-container">
            <div className="stage-dp-table">
                <table>
                    <thead>
                    <tr>
                        <td></td>
                        {uniqueStages.map(stage => (
                            citiesByStage[stage].map((city, cityIndex) => (
                                <th key={`stage-${stage}-${cityIndex}`} className="stage-header">
                                    Stage {stage}
                                </th>
                            ))
                        ))}
                    </tr>
                    <tr>
                        <td></td>
                        {uniqueStages.map(stage => (
                            citiesByStage[stage].map((city, cityIndex) => (
                                <th
                                    key={`city-${stage}-${cityIndex}`}
                                    className={`city-header ${city === solver.startCity ? 'start-city' : ''} ${city === solver.endCity ? 'end-city' : ''}`}
                                >
                                    {city}
                                </th>
                            ))
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {cities.map((fromCity, rowIndex) => (
                        <tr key={`row-${fromCity}`}>
                            <td className={`city-name ${fromCity === solver.startCity ? 'start-city' : ''} ${fromCity === solver.endCity ? 'end-city' : ''}`}>
                                {fromCity}
                            </td>
                            {cities.map((toCity, colIndex) => {
                                const cost = costs[rowIndex][colIndex];
                                const path = paths[rowIndex][colIndex];
                                const isOptimal = isOptimalPathSegment(fromCity, toCity);

                                const hasValidCost = cost !== Infinity && cost !== 0;
                                const isEndCell = cost === 0 && fromCity === toCity && fromCity === solver.endCity;

                                return (
                                    <td
                                        key={`cell-${rowIndex}-${colIndex}`}
                                        className={`dp-cell ${hasValidCost ? 'has-value' : ''} ${isOptimal ? 'optimal-path' : ''}`}
                                    >
                                        {hasValidCost ? (
                                            <>
                                                <span className="cost-value">{cost}</span>
                                                {path && <span className="path-city">{path}</span>}
                                            </>
                                        ) : isEndCell ? (
                                            <span className="cost-value">End</span>
                                        ) : null}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function App() {
    const [inputData, setInputData] = useState('');
    const [solver, setSolver] = useState(null);
    const [activeTab, setActiveTab] = useState('results');
    const [errorMessage, setErrorMessage] = useState('');
    const [showResults, setShowResults] = useState(false);
    const handleSolve = () => {
        try {
            setErrorMessage('');

            if (!inputData.trim()) {
                setErrorMessage('Please enter input data.');
                setShowResults(false);
                return;
            }

            const travelSolver = new MinimumCostTravelSolver();
            const parsed = travelSolver.parseInput(inputData);

            if (!parsed) {
                setErrorMessage('Failed to parse input data. Please check the format.');
                setShowResults(false);
                return;
            }

            travelSolver.solve();
            setSolver(travelSolver);
            setShowResults(true);
        } catch (error) {
            setErrorMessage('An error occurred: ' + error.message);
            setShowResults(false);
            console.error(error);
        }
    };
    const loadSample = () => {
        setInputData(`14
Start, End
Start, [A,22,70], [B,8,80], [C,12,80]
A, [D,8,50], [E,10,70]
B, [D,25,50], [E,10,70]
C, [D,13,50], [E,13,70]
D, [F,25,50], [G,30,70], [H,18,70], [I,27,60]
E, [F,12,50], [G,10,70], [H,8,70], [I,7,60]
F, [J,26,50], [K,13,70], [L,15,60]
G, [J,8,50], [K,10,70], [L,10,60]
H, [J,20,50], [K,10,70], [L,10,60]
I, [J,15,50], [K,10,70], [L,7,60]
J, [End,10,0]
K, [End,10,0]
L, [End,10,0]
End, []
`);
    };
    useEffect(() => {
        document.title = "Dynamic React";
    }, []);


    return (
        <div className="app-container">
            <h1>Minimum Cost Travel Solver</h1>

            <div className="input-section">
                <div className="button-group">
                    <button onClick={loadSample} className="sample-button">
                        Load Sample Data
                    </button>
                    <button onClick={handleSolve} className="solve-button">
                        Solve
                    </button>
                </div>

                <textarea
                    value={inputData}
                    onChange={(e) => setInputData(e.target.value)}
                    className="input-textarea"
                    placeholder="Enter input data here..."
                />

                {errorMessage && (
                    <div className="error-message">
                        {errorMessage}
                    </div>
                )}
            </div>

            {showResults && solver && (
                <div className="results-section">
                    <div className="tab-navigation">
                        <button
                            className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
                            onClick={() => setActiveTab('results')}
                        >
                            Path Results
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'dpTable' ? 'active' : ''}`}
                            onClick={() => setActiveTab('dpTable')}
                        >
                            Stage DP Table
                        </button>
                    </div>

                    <div className="tab-content">
                        {activeTab === 'results' && <PathResults paths={solver.getPaths()} />}
                        {activeTab === 'dpTable' && <StageDPTable solver={solver} />}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;