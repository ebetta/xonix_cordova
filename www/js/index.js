// --- Configurações do Jogo ---
    const GRID_SIZE = 10; 
    let COLS, ROWS;       
    let canvasWidth, canvasHeight;

    const ST_EMPTY = 0;      
    const ST_FILLED = 1;     
    const ST_TRAIL = 2;      

    let grid;             
    let player;
    let enemies = []; 
    const NUM_ENEMIES = 30; 
    const PERCENTUAL_BOIDS_CACADORES = 0.4; 
    const NORMAL_BOID_MAX_SPEED = 3.8;      
    const HUNTING_SPEED_MULTIPLIER = 1.4; 

    let score = 0;
    let totalFillableCells = 0;
    let gameState = 'splashScreen'; 
    let percentualAreaExibido = 0; 
    let elementoInfoPercentual; 

    let splashScreenImage;
    let backgroundImage = null; // Initialize to null for better checking
    // let caterpillarImage; // Removed in favor of directional images
    let caterpillarUpImage, caterpillarDownImage, caterpillarLeftImage, caterpillarRightImage;
    let splashScreenTimer = 0;
    const SPLASH_DURATION = 4000; // 4 seconds in milliseconds

    let restartButtonProps = { x: 0, y: 0, w: 0, h: 0, label: "Reiniciar" };

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false; 
    const swipeThreshold = GRID_SIZE * 1.2; 

    const SUPERNOVA_COLORS = [
      [255, 100, 0, 220],   
      [255, 150, 50, 220],  
      [200, 0, 255, 200],   
      [150, 50, 255, 200],  
      [0, 100, 255, 210],   
      [50, 150, 255, 210],  
      [255, 20, 147, 200],  
      [255, 182, 193, 190], 
      [240, 248, 255, 180], 
      [255, 220, 180, 200]  
    ];
    let playerColor;
    let trailColor;
    let filledColor;
    let emptyColor;
    let yellowColor; // For background underlay

    // Background Image Transform Variables
    let imageScale = 1;
    let scaledImageWidth = 0;
    let scaledImageHeight = 0;
    let imageOffsetX = 0;
    let imageOffsetY = 0;

    // --- Classe do Jogador ---
    class Player {
      constructor(x, y) {
        this.x = x; 
        this.y = y;
        this.dx = 0; 
        this.dy = 0; 
        this.isDrawingTrail = false;
        this.trailPath = []; 
        this.moveCooldown = 0;
        this.moveInterval = 5; 
        // this.currentAngle = 0; // Removed, using currentImage now
        this.currentImage = caterpillarUpImage; // Default to up image
      }

      setDirection(dx, dy) {
        if (this.isDrawingTrail) {
            if (dx !== 0 && dx === -this.dx) return; 
            if (dy !== 0 && dy === -this.dy) return; 
        }
        this.dx = dx;
        this.dy = dy;
      }
      
      update() {
        if (this.dx === 0 && this.dy === 0 ) { 
            this.moveCooldown = 0; 
            return;
        }

        this.moveCooldown++;
        if (this.moveCooldown >= this.moveInterval ) { 
            if(this.dx !==0 || this.dy !==0) this.moveCooldown = 0; 

            let currentX = this.x;
            let currentY = this.y;
            let nextX = this.x + this.dx;
            let nextY = this.y + this.dy;

            nextX = constrain(nextX, 0, COLS - 1);
            nextY = constrain(nextY, 0, ROWS - 1);
            
            if(this.x === nextX && this.y === nextY && (this.dx !==0 || this.dy !==0) ){
                if(!this.isDrawingTrail){
                    this.dx = 0;
                    this.dy = 0;
                    console.log("Jogador colidiu com a borda e parou (não desenhando).");
                    return;
                } else { 
                     console.log("Jogador bateu na borda do canvas enquanto desenhava trilha.");
                    this.dx = 0; 
                    this.dy = 0;
                    return;
                }
            }

            const nextCellState = grid[nextX][nextY];
            if (this.isDrawingTrail) {
                if (nextCellState === ST_FILLED) {
                    // Player is drawing a trail and hits a filled cell - completes the trail
                    grid[this.x][this.y] = ST_TRAIL; // Mark current cell as part of the trail
                    this.trailPath.push({ x: this.x, y: this.y, originalStateGridBeforeTrail: ST_EMPTY }); // Current cell was empty before becoming trail

                    this.x = nextX; // Move player to the landing cell
                    this.y = nextY;
                    // The landing cell itself was ST_FILLED, this is important for its originalState.
                    this.trailPath.push({ x: this.x, y: this.y, originalStateGridBeforeTrail: ST_FILLED });

                    let isBorderClosure = (nextX === 0 || nextX === COLS - 1 || nextY === 0 || nextY === ROWS - 1);
                    completeAreaFill(this.trailPath, isBorderClosure); // Pass the collected path and border status

                    this.isDrawingTrail = false; // Reset trail drawing state
                    this.trailPath = []; // Clear the path AFTER completion
                    // grid[this.x][this.y] = ST_FILLED; // Landing cell remains ST_FILLED, no change needed here by player update
                    this.dx = 0; // Stop player movement
                    this.dy = 0;
                } else if (nextCellState === ST_TRAIL) {
                    // Player crossed their own trail
                    console.log("Jogador cruzou a própria trilha!");
                    // Revert trail cells to their original state before game over
                    for (let segment of this.trailPath) {
                        grid[segment.x][segment.y] = segment.originalStateGridBeforeTrail;
                    }
                    gameOver();
                    return;
                } else { // nextCellState === ST_EMPTY
                    // Continue drawing trail on an empty cell
                    grid[this.x][this.y] = ST_TRAIL; // Mark current cell as part of the trail
                    this.trailPath.push({ x: this.x, y: this.y, originalStateGridBeforeTrail: ST_EMPTY }); // Current cell was empty

                    this.x = nextX; // Move player
                    this.y = nextY;
                    // The new cell player is on is now part of the trail, but it's not added to trailPath here.
                    // It will be added in the next update cycle when the player moves *from* it.
                    // Or, if this is the cell *before* hitting ST_FILLED, it's added right before completion.
                }
            } else { // Not currently drawing a trail
                if (nextCellState === ST_EMPTY) {
                    // Player is on a filled cell and moves to an empty cell - starts drawing a trail
                    this.isDrawingTrail = true;
                    // The cell the player is *leaving* was ST_FILLED.
                    this.trailPath = [{ x: this.x, y: this.y, originalStateGridBeforeTrail: grid[this.x][this.y] }]; // Capture original state of starting point

                    this.x = nextX; // Move player
                    this.y = nextY;
                    // The cell player is now on (nextX, nextY) was ST_EMPTY. It will be marked ST_TRAIL in the next update
                    // if the trail continues, or its original state (ST_EMPTY) will be recorded as such.
                } else { // Player is on a filled cell and moves to another filled cell
                    this.x = nextX;
                    this.y = nextY;
                }
            }
        }
      }

      draw() {
        noStroke();

        // Determine current image based on direction
        if (this.dy === -1) { // Up
            this.currentImage = caterpillarUpImage;
        } else if (this.dy === 1) { // Down
            this.currentImage = caterpillarDownImage;
        } else if (this.dx === -1) { // Left
            this.currentImage = caterpillarLeftImage;
        } else if (this.dx === 1) { // Right
            this.currentImage = caterpillarRightImage;
        }
        // If not moving (dx and dy are 0), currentImage remains as the last direction's image.
        // This also means if it started as caterpillarUpImage (from constructor) and hasn't moved, it stays that.

        if (this.currentImage && this.currentImage.width > 0) {
          image(this.currentImage, this.x * GRID_SIZE, this.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        } else {
          // Fallback: Draw original rectangle if image isn't loaded or currentImage is null
          fill(playerColor);
          rect(this.x * GRID_SIZE, this.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        }
      }
    }

    // --- Classe Enemy (Boid Caçador) ---
    class Enemy {
      constructor(pixelX, pixelY) {
        this.position = createVector(pixelX, pixelY); 
        this.velocity = p5.Vector.random2D();     
        
        this.normalMaxSpeed = NORMAL_BOID_MAX_SPEED;
        this.huntingMaxSpeed = this.normalMaxSpeed * HUNTING_SPEED_MULTIPLIER;
        this.maxSpeed = this.normalMaxSpeed; 
        
        this.velocity.setMag(random(this.normalMaxSpeed * 0.6, this.normalMaxSpeed * 0.95)); 
        this.acceleration = createVector();       
        this.maxForce = 0.25;  

        let colArray = random(SUPERNOVA_COLORS); 
        this.baseColorR = colArray[0]; 
        this.baseColorG = colArray[1];
        this.baseColorB = colArray[2];
        this.baseAlpha = colArray[3];
        this.color = color(this.baseColorR, this.baseColorG, this.baseColorB, this.baseAlpha);
        
        this.r = GRID_SIZE * 0.45; 
        this.trail = [];
        this.trailLength = 22; 

        this.separationPerception = this.r * 4.0; 
        this.alignmentPerception = GRID_SIZE * 5;  
        this.cohesionPerception = GRID_SIZE * 5;   
        
        this.obstaclePerceptionRadius = GRID_SIZE * 3.5; 
        this.obstacleAvoidanceForceFactor = 0.4; 

        this.isHunter = (random(1) < PERCENTUAL_BOIDS_CACADORES); 
        this.huntForceMultiplier = 0.35; 
      }

      applyForce(force) {
        this.acceleration.add(force);
      }

      huntPlayer(currentPlayer) {
        let steer = createVector(0,0);
        if (this.isHunter && currentPlayer.isDrawingTrail) {
            let playerPixelTarget = createVector(
                currentPlayer.x * GRID_SIZE + GRID_SIZE / 2,
                currentPlayer.y * GRID_SIZE + GRID_SIZE / 2
            );
            steer = this.seek(playerPixelTarget); 
            steer.mult(this.huntForceMultiplier); 
        }
        return steer;
      }

      flock(allEnemies, currentPlayer) { 
        let sep = this.separate(allEnemies);   
        let ali = this.align(allEnemies);      
        let coh = this.cohesion(allEnemies);   
        let obs = this.avoidGridObstacles(grid, currentPlayer); 
        let hunt = this.huntPlayer(currentPlayer); 

        sep.mult(1.8); 
        ali.mult(1.0);
        coh.mult(0.9); 
        obs.mult(3.8); 
        hunt.mult(2.8); 

        this.applyForce(sep);
        this.applyForce(ali);
        this.applyForce(coh);
        this.applyForce(obs);
        this.applyForce(hunt); 
      }

      separate(allEnemies) {
        let steer = createVector(0, 0);
        let count = 0;
        for (let other of allEnemies) {
          if (other === this) continue;
          let d = p5.Vector.dist(this.position, other.position);
          if ((d > 0) && (d < this.separationPerception)) {
            let diff = p5.Vector.sub(this.position, other.position);
            if (diff.magSq() > 0) { 
                diff.normalize();
                diff.div(d); 
                steer.add(diff);
                count++;
            }
          }
        }
        if (count > 0) {
          steer.div(count);
        }
        if (steer.magSq() > 0) { 
          steer.normalize();
          steer.mult(this.maxSpeed); 
          steer.sub(this.velocity);
          steer.limit(this.maxForce);
        }
        return steer;
      }

      align(allEnemies) {
        let sum = createVector(0, 0);
        let count = 0;
        for (let other of allEnemies) {
          if (other === this) continue;
          let d = p5.Vector.dist(this.position, other.position);
          if ((d > 0) && (d < this.alignmentPerception)) {
            sum.add(other.velocity);
            count++;
          }
        }
        if (count > 0) {
          sum.div(count);
          if (sum.magSq() > 0) { 
            sum.normalize();
            sum.mult(this.maxSpeed); 
            let steer = p5.Vector.sub(sum, this.velocity);
            steer.limit(this.maxForce);
            return steer;
          }
        }
        return createVector(0, 0);
      }

      cohesion(allEnemies) {
        let sum = createVector(0, 0);
        let count = 0;
        for (let other of allEnemies) {
          if (other === this) continue;
          let d = p5.Vector.dist(this.position, other.position);
          if ((d > 0) && (d < this.cohesionPerception)) {
            sum.add(other.position);
            count++;
          }
        }
        if (count > 0) {
          sum.div(count);
          return this.seek(sum); 
        } else {
          return createVector(0, 0);
        }
      }

      seek(target) {
        let desired = p5.Vector.sub(target, this.position);
        if (desired.magSq() > 0) { 
            desired.normalize();
            desired.mult(this.maxSpeed); 
            let steer = p5.Vector.sub(desired, this.velocity);
            steer.limit(this.maxForce);
            return steer;
        }
        return createVector(0,0);
      }
      
      avoidGridObstacles(currentGrid, currentPlayer) {
        let steer = createVector(0, 0);
        let count = 0;
        const lookAheadDistances = [this.obstaclePerceptionRadius * 0.8, this.obstaclePerceptionRadius * 0.4, this.r * 1.5];
        const angles = [0, -PI / 5, PI / 5]; 

        for (let dist of lookAheadDistances) {
            for (let angle of angles) {
                let checkPoint = this.velocity.copy().rotate(angle).setMag(dist);
                let futurePos = p5.Vector.add(this.position, checkPoint);
                let gridX = floor(futurePos.x / GRID_SIZE);
                let gridY = floor(futurePos.y / GRID_SIZE);
                let isObstacleToAvoid = false; 
                let obstacleCenter = null;

                if (gridX >= 0 && gridX < COLS && gridY >= 0 && gridY < ROWS) {
                    let cellState = currentGrid[gridX][gridY];
                    if (cellState === ST_FILLED) {
                        isObstacleToAvoid = true;
                    }
                    if (currentPlayer.isDrawingTrail && gridX === currentPlayer.x && gridY === currentPlayer.y) {
                        isObstacleToAvoid = true; 
                    }
                    if (isObstacleToAvoid) { 
                         obstacleCenter = createVector(gridX * GRID_SIZE + GRID_SIZE / 2, gridY * GRID_SIZE + GRID_SIZE / 2);
                    }
                } else { 
                    isObstacleToAvoid = true; 
                    let clampedX = constrain(futurePos.x, 0, width);
                    let clampedY = constrain(futurePos.y, 0, height);
                    if (clampedX !== futurePos.x || clampedY !== futurePos.y) { 
                        obstacleCenter = createVector(clampedX, clampedY); 
                    }
                }

                if (isObstacleToAvoid && obstacleCenter) { 
                    let diff = p5.Vector.sub(this.position, obstacleCenter);
                    let d = diff.mag();
                    if (d > 0 && d < this.obstaclePerceptionRadius * 1.2) { 
                        diff.normalize(); 
                        let strength = (this.maxSpeed * 2.5) / ( (d*d / (GRID_SIZE*GRID_SIZE) ) + 0.1); 
                        diff.mult(strength);
                        steer.add(diff);
                        count++;
                    }
                }
            }
        }

        if (count > 0) {
            steer.div(count);
            if(steer.magSq() > 0) { 
                steer.normalize();
                steer.mult(this.maxSpeed); 
                steer.sub(this.velocity);
                steer.limit(this.maxForce * 1.5); 
            }
        }
        return steer;
      }

      update() {
        if (this.isHunter && player.isDrawingTrail) {
            this.maxSpeed = this.huntingMaxSpeed;
        } else {
            this.maxSpeed = this.normalMaxSpeed;
        }

        this.flock(enemies, player); 

        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed); 
        this.position.add(this.velocity);
        this.acceleration.mult(0); 

        if (this.position.x < this.r) { this.position.x = this.r; this.velocity.x *= -0.8; }
        else if (this.position.x > width - this.r) { this.position.x = width - this.r; this.velocity.x *= -0.8; }
        if (this.position.y < this.r) { this.position.y = this.r; this.velocity.y *= -0.8; }
        else if (this.position.y > height - this.r) { this.position.y = height - this.r; this.velocity.y *= -0.8; }

        this.trail.push(this.position.copy());
        if (this.trail.length > this.trailLength) {
          this.trail.splice(0, 1);
        }

        let boidGridX = floor(this.position.x / GRID_SIZE);
        let boidGridY = floor(this.position.y / GRID_SIZE);

        if (boidGridX >= 0 && boidGridX < COLS && boidGridY >= 0 && boidGridY < ROWS) {
            if (player.isDrawingTrail) {
                for (let p of player.trailPath) {
                    if (boidGridX === p.x && boidGridY === p.y) {
                        console.log("Boid Caçador Melhorado atingiu trilha em formação!"); gameOver(); return;
                    }
                }
                if (boidGridX === player.x && boidGridY === player.y) {
                     console.log("Boid Caçador Melhorado atingiu jogador na trilha!"); gameOver(); return;
                }
            }
            if (grid[boidGridX][boidGridY] === ST_TRAIL) {
                console.log("Boid Caçador Melhorado pisou em ST_TRAIL!"); gameOver();
            }
        }
      }

      render() {
        noStroke(); 
        for (let i = 0; i < this.trail.length; i++) {
          let p = this.trail[i];
          let trailColorRatio = i / (this.trail.length -1 + 0.001); 
          let r = lerp(this.baseColorR, this.baseColorR + 70, trailColorRatio); 
          let g = lerp(this.baseColorG, this.baseColorG + 70, trailColorRatio);
          let b = lerp(this.baseColorB, this.baseColorB + 70, trailColorRatio);
          r = constrain(r, 0, 255);
          g = constrain(g, 0, 255);
          b = constrain(b, 0, 255);
          let alphaVal = map(trailColorRatio, 0, 1, this.baseAlpha * 0.1, this.baseAlpha * 0.85); 
          let trailSize = map(trailColorRatio, 0, 1, this.r * 0.15, this.r * 1.25); 
          
          fill(r, g, b, alphaVal);
          ellipse(p.x, p.y, trailSize, trailSize);
        }
        
        let theta = this.velocity.heading() + PI / 2; 
        fill(this.color); 
        noStroke();       
        push(); 
        translate(this.position.x, this.position.y); 
        rotate(theta); 
        beginShape();
        vertex(0, -this.r * 1.3);       
        vertex(-this.r * 0.8, this.r * 0.65); 
        vertex(this.r * 0.8, this.r * 0.65);  
        endShape(CLOSE); 
        pop(); 
      }
    }

    // --- Funções do Jogo ---
    function initializeGrid() {
      grid = new Array(COLS);
      totalFillableCells = 0;
      for (let i = 0; i < COLS; i++) {
        grid[i] = new Array(ROWS);
        for (let j = 0; j < ROWS; j++) {
          if (i === 0 || i === COLS - 1 || j === 0 || j === ROWS - 1) {
            grid[i][j] = ST_FILLED;
          } else {
            grid[i][j] = ST_EMPTY;
            totalFillableCells++;
          }
        }
      }
    }

    function floodFill(x, y, targetState, replacementState) {
        if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
        if (grid[x][y] !== ST_EMPTY) return;  

        grid[x][y] = replacementState; 
        score++;
        if ((x === 10 && y === 10) || (x === Math.floor(COLS/2) && y === Math.floor(ROWS/2))) { console.log("[floodFill] Cell", x, y, "changed to state:", replacementState, "Global score is now:", score); }

        floodFill(x + 1, y, targetState, replacementState);
        floodFill(x - 1, y, targetState, replacementState);
        floodFill(x, y + 1, targetState, replacementState);
        floodFill(x, y - 1, targetState, replacementState);
    }

    function completeAreaFill(trailPathFromPlayer, isBorderClosure) {
        // Ensure existing console logs (or add new ones) clearly indicate parameters
        console.log("[completeAreaFill] Called. pathLength:", trailPathFromPlayer.length, "isBorderClosure:", isBorderClosure);

        if (trailPathFromPlayer.length < 3) {
            for (let p_data of trailPathFromPlayer) {
                grid[p_data.x][p_data.y] = p_data.originalStateGridBeforeTrail;
            }
            console.log("[completeAreaFill] Path too short, reverted.");
            checkLevelComplete(); // Ensure this is called
            return;
        }

        let filledSuccessfully = false;
        let chosenAreaForEnemyRemoval = null;

        if (isBorderClosure) {
            console.log("[completeAreaFill] BorderClosure specific logic activated.");
            let trailItselfAreaCells = [];
            for (let p_data of trailPathFromPlayer) {
                if (p_data.originalStateGridBeforeTrail === ST_EMPTY) {
                    trailItselfAreaCells.push({ x: p_data.x, y: p_data.y });
                }
            }

            if (trailItselfAreaCells.length > 0) {
                console.log("[completeAreaFill] BorderClosure: Attempting to fill 'trailItself' of size:", trailItselfAreaCells.length);
                for (let cell of trailItselfAreaCells) {
                    grid[cell.x][cell.y] = ST_FILLED;
                    score++;
                }
                // Ensure border segments of the trail also remain/become ST_FILLED
                for (let p_data of trailPathFromPlayer) {
                    if (p_data.originalStateGridBeforeTrail === ST_FILLED) {
                        grid[p_data.x][p_data.y] = ST_FILLED;
                    }
                }
                filledSuccessfully = true;
                chosenAreaForEnemyRemoval = trailItselfAreaCells;
                console.log("[completeAreaFill] BorderClosure: 'trailItself' filled. Score updated.");
            } else {
                console.log("[completeAreaFill] BorderClosure: 'trailItself' is empty. No fill performed.");
                filledSuccessfully = false;
            }
        } else { // General logic for non-border closures
            console.log("[completeAreaFill] Non-BorderClosure general logic activated.");

            // Temporarily mark all cells in the current path as ST_FILLED for boundary detection
            for (let p_data of trailPathFromPlayer) {
                grid[p_data.x][p_data.y] = ST_FILLED;
            }

            let fillCandidates = [];
            for (let i = 0; i < trailPathFromPlayer.length -1; i++) {
                const p1 = trailPathFromPlayer[i];
                const p2 = trailPathFromPlayer[i+1];
                let dx = p2.x - p1.x; let dy = p2.y - p1.y;
                let s1x,s1y,s2x,s2y;
                s1x=p1.x-dy; s1y=p1.y+dx; s2x=p1.x+dy; s2y=p1.y-dx;
                if(isValidForFillStart(s1x,s1y)) fillCandidates.push({x:s1x,y:s1y});
                if(isValidForFillStart(s2x,s2y)) fillCandidates.push({x:s2x,y:s2y});
                s1x=p2.x-dy; s1y=p2.y+dx; s2x=p2.x+dy; s2y=p2.y-dx;
                if(isValidForFillStart(s1x,s1y)) fillCandidates.push({x:s1x,y:s1y});
                if(isValidForFillStart(s2x,s2y)) fillCandidates.push({x:s2x,y:s2y});
            }
            fillCandidates = fillCandidates.filter((item,idx,self) => idx === self.findIndex(t => t.x===item.x && t.y===item.y));

            let potentialAreas = [];
            let visitedCandidateCellsForAreaCalc = new Set();
            for (let cand of fillCandidates) {
                const candKey = `${cand.x},${cand.y}`;
                if(visitedCandidateCellsForAreaCalc.has(candKey) || grid[cand.x][cand.y] !== ST_EMPTY) continue;
                let areaCells = getAreaIfFilled(cand.x, cand.y, ST_EMPTY);
                if(areaCells.length>0){
                    potentialAreas.push({areaCells:areaCells,size:areaCells.length,type:'emptyRegion',candidateStartCell:cand});
                    areaCells.forEach(cell=>visitedCandidateCellsForAreaCalc.add(`${cell.x},${cell.y}`));
                }
            }

            let trailItselfGen = []; // General trailItself
            for(let p_data of trailPathFromPlayer){
                if(p_data.originalStateGridBeforeTrail === ST_EMPTY) trailItselfGen.push({x:p_data.x,y:p_data.y});
            }
            if(trailItselfGen.length > 0) {
                potentialAreas.push({areaCells:trailItselfGen,size:trailItselfGen.length,type:'trailItself',candidateStartCell:null});
            }

            console.log("[completeAreaFill] General logic - potentialAreas:", JSON.stringify(potentialAreas.map(p => ({type: p.type, size: p.size}))));

            let chosenArea = null;
            if(potentialAreas.length > 0){
                potentialAreas.sort((a,b)=>a.size-b.size);
                chosenArea = potentialAreas[0];
            }

            if(chosenArea){ console.log("[completeAreaFill] General logic - chosenArea: type:", chosenArea.type, "size:", chosenArea.size); }
            else{ console.log("[completeAreaFill] General logic - chosenArea is null"); }

            let heuristicPreventedFill = false;
            if(chosenArea && chosenArea.type === 'emptyRegion' && totalFillableCells > 0){
                const ratio = chosenArea.size / totalFillableCells;
                if(ratio > 0.30){
                    const trailCand = potentialAreas.find(p=>p.type === 'trailItself');
                    if(trailCand && trailCand.size > chosenArea.size){
                        console.log("[completeAreaFill] Heuristic: Main field (size "+chosenArea.size+") chosen due to long trail (size "+trailCand.size+"). Preventing fill.");
                        heuristicPreventedFill = true;
                    }
                }
            }

            if(!heuristicPreventedFill && chosenArea && chosenArea.size > 0){
                if(chosenArea.type === 'trailItself'){
                    for(let cell of chosenArea.areaCells){grid[cell.x][cell.y]=ST_FILLED; score++;}
                    filledSuccessfully = true;
                    chosenAreaForEnemyRemoval = chosenArea.areaCells;
                    console.log("[completeAreaFill] General logic - Filled 'trailItself'. Size:", chosenArea.size);
                } else { // emptyRegion
                    let startCell = chosenArea.candidateStartCell;
                    if(!startCell || grid[startCell.x][startCell.y] !== ST_EMPTY) {
                        startCell = chosenArea.areaCells.find(c=>grid[c.x][c.y] === ST_EMPTY);
                    }
                    if(startCell){
                        floodFill(startCell.x,startCell.y,ST_EMPTY,ST_FILLED);
                        filledSuccessfully = true;
                        chosenAreaForEnemyRemoval = chosenArea.areaCells; // Use getAreaIfFilled result for enemy check
                        console.log("[completeAreaFill] General logic - Filled 'emptyRegion'. Size:", chosenArea.size, "From:",startCell);
                    } else {
                        console.log("[completeAreaFill] General logic - Error: 'emptyRegion' (size "+chosenArea.size+") has no ST_EMPTY start cell.");
                        filledSuccessfully = false;
                    }
                }
            } else {
                if(heuristicPreventedFill){ console.log("[completeAreaFill] General logic - Heuristic prevented fill."); }
                else { console.log("[completeAreaFill] General logic - No valid chosenArea or size is 0."); }
                filledSuccessfully = false;
            }
        } // End general logic

        // Common post-fill/reversion logic
        if (filledSuccessfully) {
            console.log("[completeAreaFill] Fill successful. Before enemy removal. enemies.length:", enemies.length, "chosenAreaForEnemyRemoval.length:", chosenAreaForEnemyRemoval ? chosenAreaForEnemyRemoval.length : 'null');
            if (chosenAreaForEnemyRemoval) {
                const enemiesToRemoveIndices = [];
                for (let i = enemies.length - 1; i >= 0; i--) {
                    const enemy = enemies[i];
                    const eGridX = floor(enemy.position.x / GRID_SIZE);
                    const eGridY = floor(enemy.position.y / GRID_SIZE);
                    if (chosenAreaForEnemyRemoval.some(cell => cell.x === eGridX && cell.y === eGridY)) {
                        enemiesToRemoveIndices.push(i);
                    }
                }
                for (let idx of enemiesToRemoveIndices) { enemies.splice(idx, 1); }
                console.log("[completeAreaFill] After enemy removal. enemies.length:", enemies.length);
            }
        } else {
            console.log("[completeAreaFill] No fill / fill failed. Reverting trail.");
            for (let p_data of trailPathFromPlayer) {
                grid[p_data.x][p_data.y] = p_data.originalStateGridBeforeTrail;
            }
        }

        console.log("[completeAreaFill] Ending. filledSuccessfully:", filledSuccessfully, "Current score:", score);
        checkLevelComplete();
    }

    function isValidForFillStart(x,y){
        return x > 0 && x < COLS -1 && y > 0 && y < ROWS -1 && grid[x][y] === ST_EMPTY;
    }
    
    function getAreaIfFilled(startX, startY, targetState) {
        let area = [];
        let q = [{x: startX, y: startY}];
        let visited = new Set(); 
        visited.add(`${startX},${startY}`);
        // IMPORTANT: Use a *copy* of the grid for this simulation to avoid side-effects
        let tempGrid = grid.map(arr => arr.slice()); 

        while (q.length > 0) {
            let curr = q.shift();
            // Boundary and state checks are against the tempGrid
            if (curr.x < 0 || curr.x >= COLS || curr.y < 0 || curr.y >= ROWS || 
                tempGrid[curr.x][curr.y] !== targetState) { 
                continue;
            }
            area.push(curr);
            tempGrid[curr.x][curr.y] = -1; // Mark as visited in the tempGrid
            const neighbors = [
                {x: curr.x + 1, y: curr.y}, {x: curr.x - 1, y: curr.y},
                {x: curr.x, y: curr.y + 1}, {x: curr.x, y: curr.y - 1}
            ];
            for (let n of neighbors) {
                if (!visited.has(`${n.x},${n.y}`)) {
                    q.push(n);
                    visited.add(`${n.x},${n.y}`);
                }
            }
        }
        return area;
    }

    function drawGrid() {
      console.log("[drawGrid] Starting. Sample cells: grid[10][10]=", (COLS > 10 && ROWS > 10 && grid[10] ? grid[10][10] : 'undef'), "grid[COLS/2][ROWS/2]=", (COLS > 0 && ROWS > 0 && grid[Math.floor(COLS/2)] ? grid[Math.floor(COLS/2)][Math.floor(ROWS/2)] : 'undef') );
      noStroke(); // Call noStroke once for the entire grid drawing
      for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < ROWS; j++) {
          let dx = i * GRID_SIZE;
          let dy = j * GRID_SIZE;

          if (grid[i][j] === ST_FILLED) {
            // Draw yellow underlay for ST_FILLED cells
            fill(yellowColor); 
            rect(dx, dy, GRID_SIZE, GRID_SIZE);

            if (backgroundImage && backgroundImage.width > 0 && backgroundImage.height > 0 && imageScale > 0) {
                let targetCanvasX = i * GRID_SIZE;
                let targetCanvasY = j * GRID_SIZE;
                let targetCanvasWidth = GRID_SIZE;
                let targetCanvasHeight = GRID_SIZE;

                // sx, sy, sWidth, sHeight are from the *original* unscaled backgroundImage
                let sx_before_clip = (targetCanvasX - imageOffsetX) / imageScale;
                let sy_before_clip = (targetCanvasY - imageOffsetY) / imageScale;
                let sWidth_before_clip = targetCanvasWidth / imageScale;
                let sHeight_before_clip = targetCanvasHeight / imageScale;

                if ( (i === 0 && j === 0) || (i === 1 && j === 1) || (i === Math.floor(COLS/2) && j === Math.floor(ROWS/2)) ) {
                    // console.log(`--- Debugging drawGrid cell[${i}][${j}] ---`);
                }

                let sx = sx_before_clip;
                let sy = sy_before_clip;
                let sWidth = sWidth_before_clip;
                let sHeight = sHeight_before_clip;

                if (targetCanvasX + targetCanvasWidth < imageOffsetX ||
                    targetCanvasX > imageOffsetX + scaledImageWidth ||
                    targetCanvasY + targetCanvasHeight < imageOffsetY ||
                    targetCanvasY > imageOffsetY + scaledImageHeight ||
                    sWidth <= 0 || sHeight <= 0) {
                    if ( (i === 0 && j === 0) || (i === 1 && j === 1) || (i === Math.floor(COLS/2) && j === Math.floor(ROWS/2)) ) {
                        // console.log(`Cell [${i}][${j}] determined to be outside image bounds or sWidth/sHeight <=0 initially. Remains yellow.`);
                    }
                } else {
                    if (sx < 0) { sWidth += sx; sx = 0; }
                    if (sy < 0) { sHeight += sy; sy = 0; }
                    if (sx + sWidth > backgroundImage.width) { sWidth = backgroundImage.width - sx; }
                    if (sy + sHeight > backgroundImage.height) { sHeight = backgroundImage.height - sy; }

                    if (sWidth > 0 && sHeight > 0) {
                        if ( (i === 0 && j === 0) || (i === 1 && j === 1) || (i === Math.floor(COLS/2) && j === Math.floor(ROWS/2)) ) {
                            // console.log(`Post-clip (sx,sy): ${sx}, ${sy}`);
                        }
                        image(backgroundImage, 
                              dx, dy, targetCanvasWidth, targetCanvasHeight,
                              sx, sy, sWidth, sHeight);
                    } else {
                        if ( (i === 0 && j === 0) || (i === 1 && j === 1) || (i === Math.floor(COLS/2) && j === Math.floor(ROWS/2)) ) {
                            // console.log(`Cell [${i}][${j}] sWidth or sHeight became <=0 after clipping. sx:${sx}, sy:${sy}, sW:${sWidth}, sH:${sHeight}. Stays yellow.`);
                        }
                    }
                }
            }
            
          } else if (grid[i][j] === ST_EMPTY) {
            fill(emptyColor);
            rect(dx, dy, GRID_SIZE, GRID_SIZE);
          } else if (grid[i][j] === ST_TRAIL) {
            fill(trailColor); 
            rect(dx, dy, GRID_SIZE, GRID_SIZE);
          }
        }
      }
    }

    function calculateBackgroundImageTransform() {
      if (!backgroundImage || backgroundImage.width === 0 || backgroundImage.height === 0) {
        console.log("calculateBackgroundImageTransform: backgroundImage not loaded or invalid.");
        return;
      }
      let canvasW = width; let canvasH = height;
      let imgAspect = backgroundImage.width / backgroundImage.height;
      let canvasAspect = canvasW / canvasH;
      if (imgAspect > canvasAspect) { imageScale = canvasW / backgroundImage.width; }
      else { imageScale = canvasH / backgroundImage.height; }
      scaledImageWidth = backgroundImage.width * imageScale;
      scaledImageHeight = backgroundImage.height * imageScale;
      imageOffsetX = (canvasW - scaledImageWidth) / 2;
      imageOffsetY = (canvasH - scaledImageHeight) / 2;
      console.log("Calculated background image transform:", { imageScale, scaledImageWidth, scaledImageHeight, imageOffsetX, imageOffsetY });
    }

    function resetGame() {
      initializeGrid();
      player = new Player(0, floor(ROWS / 2));
      grid[player.x][player.y] = ST_FILLED;
      player.isDrawingTrail = false;
      player.trailPath = [];
      player.dx = 0; player.dy = 0;
      score = 0; percentualAreaExibido = 0;
      if(elementoInfoPercentual) { elementoInfoPercentual.innerHTML = `Área: ${percentualAreaExibido.toFixed(0)}%`; }

      enemies = [];
      for (let i = 0; i < NUM_ENEMIES; i++) {
        let eStartX, eStartY, eGridX, eGridY, attempts = 0;
        do { 
            eStartX = floor(random(GRID_SIZE*4, width-GRID_SIZE*4));
            eStartY = floor(random(GRID_SIZE*4, height-GRID_SIZE*4));
            eGridX = floor(eStartX/GRID_SIZE); eGridY = floor(eStartY/GRID_SIZE);
            attempts++;
            if (attempts > 100) { eStartX = width/2; eStartY = height/2; break; }
        } while (grid[eGridX] === undefined || grid[eGridX][eGridY] === undefined || grid[eGridX][eGridY] !== ST_EMPTY);
        enemies.push(new Enemy(eStartX, eStartY));
      }
      gameState = 'playing';
    }

    function gameOver() {
      gameState = 'gameOver';
      console.log("Game Over!");
    }
    
    function checkLevelComplete() {
        if (totalFillableCells === 0) percentualAreaExibido = 0;
        else percentualAreaExibido = (score / totalFillableCells) * 100;
        if(elementoInfoPercentual) elementoInfoPercentual.innerHTML = `Área: ${percentualAreaExibido.toFixed(0)}%`;
        console.log(`Progresso: ${score} / ${totalFillableCells} = ${percentualAreaExibido.toFixed(2)}%`);
        if (percentualAreaExibido >= 75) { gameState = 'levelComplete'; console.log("Nível Completo!"); }
    }

    // --- Funções p5.js ---
    let lastDirectionKey = null; 
    let currentTouchButtonDirection = { dx: 0, dy: 0 }; 
    let cnv; 

    function setup() {
      splashScreenImage = document.getElementById('splashscreen-image');
      elementoInfoPercentual = document.getElementById('info-percentual');
      const infoH = elementoInfoPercentual.offsetHeight + parseFloat(getComputedStyle(elementoInfoPercentual).marginBottom);
      const dPadH = 100 + 10 + 10;
      const availH = windowHeight - infoH - dPadH;
      canvasWidth = floor(windowWidth * 0.98 / GRID_SIZE) * GRID_SIZE;
      canvasHeight = floor(availH / GRID_SIZE) * GRID_SIZE;
      if (canvasWidth < GRID_SIZE * 25) canvasWidth = GRID_SIZE * 25; 
      if (canvasHeight < GRID_SIZE * 20) canvasHeight = GRID_SIZE * 20;
      cnv = createCanvas(canvasWidth, canvasHeight); 
      cnv.mousePressed(handleCanvasTouchStart); 
      cnv.touchStarted(handleCanvasTouchStart); 
      backgroundImage = loadImage('img/fundo_01.png', img => { backgroundImage = img; calculateBackgroundImageTransform(); }, err => { console.error('Failed background:', err); backgroundImage = null; });
      caterpillarUpImage = loadImage('img/cima.png'); caterpillarDownImage = loadImage('img/baixo.png');
      caterpillarLeftImage = loadImage('img/esquerda.png'); caterpillarRightImage = loadImage('img/direita.png');
      COLS = floor(width / GRID_SIZE); ROWS = floor(height / GRID_SIZE);
      let pBaseColor = SUPERNOVA_COLORS[Math.floor(random(SUPERNOVA_COLORS.length))];
      playerColor = color(pBaseColor[0], pBaseColor[1], pBaseColor[2]);
      trailColor = color(pBaseColor[0], pBaseColor[1], pBaseColor[2], 100);
      yellowColor = color(255, 255, 0); filledColor = color(50, 50, 70); emptyColor = color(10, 10, 20);
      angleMode(RADIANS); setupTouchControls(); frameRate(30);
    }

    function draw() {
      if (gameState === 'splashScreen') {
        splashScreenTimer += deltaTime;
        if (splashScreenTimer >= SPLASH_DURATION) {
          if (splashScreenImage) splashScreenImage.style.display = 'none';
          gameState = 'playing'; resetGame();
        }
        return;
      }
      if (gameState === 'playing') {
        if (currentTouchButtonDirection.dx !== 0 || currentTouchButtonDirection.dy !== 0) player.setDirection(currentTouchButtonDirection.dx, currentTouchButtonDirection.dy);
        background(0); drawGrid(); player.update(); player.draw();
        for (let enemy of enemies) { enemy.update(); enemy.render(); }
      } else if (gameState === 'gameOver') {
        background(50,0,0); drawRestartButton(); fill(255); textSize(width/15); textAlign(CENTER,CENTER); text("GAME OVER", width/2, height/2 - (GRID_SIZE*4));
      } else if (gameState === 'levelComplete') {
        background(0,50,0); drawRestartButton("Jogar Novamente"); fill(255); textSize(width/15); textAlign(CENTER,CENTER); text("NÍVEL COMPLETO!", width/2, height/2 - (GRID_SIZE*4));
      }
      console.log("[draw()] Frame completed. gameState:", gameState);
    }

    function drawRestartButton(label = "Reiniciar") {
        let btnW = width/3, btnH = GRID_SIZE*5, btnX = width/2-btnW/2, btnY = height/2+GRID_SIZE*1;
        restartButtonProps = {x:btnX,y:btnY,w:btnW,h:btnH,label:label};
        push(); fill(100,100,200,200); stroke(200,200,255); strokeWeight(2); rect(btnX,btnY,btnW,btnH,10);
        fill(255); noStroke(); textSize(GRID_SIZE*2); textAlign(CENTER,CENTER); text(label,btnX+btnW/2,btnY+btnH/2); pop();
    }

    function handleCanvasTouchStart(event) { 
        if (gameState === 'playing') {
            let tcDiv = document.getElementById('touch-controls');
            if (tcDiv && tcDiv.contains(event.target)) return;
            touchStartX = mouseX; touchStartY = mouseY; isSwiping = true;
            currentTouchButtonDirection.dx=0; currentTouchButtonDirection.dy=0; lastDirectionKey=null;
        }
        if(event && typeof event.preventDefault === 'function') event.preventDefault(); return false;
    }

    function touchMoved(event) { 
        if (gameState === 'playing' && isSwiping) {
            let curX=mouseX, curY=mouseY, diffX=curX-touchStartX, diffY=curY-touchStartY;
            if (abs(diffX)>swipeThreshold || abs(diffY)>swipeThreshold) {
                if(abs(diffX)>abs(diffY)) player.setDirection(diffX>0?1:-1,0); else player.setDirection(0,diffY>0?1:-1);
                touchStartX=curX; touchStartY=curY; lastDirectionKey=null; currentTouchButtonDirection.dx=0; currentTouchButtonDirection.dy=0;
            }
        }
        if(event && typeof event.preventDefault === 'function') event.preventDefault(); return false;
    }

    function touchEnded(event) { 
        if(isSwiping){isSwiping=false; player.setDirection(0,0);}
        if(event && typeof event.preventDefault==='function') event.preventDefault(); return false;
    }
    function mouseReleased(event){ touchEnded(event); }

    function keyPressed() {
      if(gameState!=='playing')return; currentTouchButtonDirection.dx=0;currentTouchButtonDirection.dy=0;isSwiping=false;player.setDirection(0,0);
      if(keyCode===UP_ARROW)player.setDirection(0,-1); else if(keyCode===DOWN_ARROW)player.setDirection(0,1);
      else if(keyCode===LEFT_ARROW)player.setDirection(-1,0); else if(keyCode===RIGHT_ARROW)player.setDirection(1,0);
      if(keyCode===UP_ARROW||keyCode===DOWN_ARROW||keyCode===LEFT_ARROW||keyCode===RIGHT_ARROW) lastDirectionKey=keyCode;
      return false; 
    }
    function keyReleased() {
        if(gameState!=='playing')return;
        if(keyCode===lastDirectionKey) {player.setDirection(0,0); lastDirectionKey=null;}
        return false;
    }
    function mousePressed(event) { 
        if(gameState==='gameOver'||gameState==='levelComplete'){
            if(mouseX>restartButtonProps.x && mouseX<restartButtonProps.x+restartButtonProps.w && mouseY>restartButtonProps.y && mouseY<restartButtonProps.y+restartButtonProps.h) resetGame();
        }
    }
    function setupTouchControls() {
        const btnUp=document.getElementById('btn-up'), btnDown=document.getElementById('btn-down'), btnLeft=document.getElementById('btn-left'), btnRight=document.getElementById('btn-right');
        const touchStartHandler=(dx,dy,e)=>{if(gameState==='playing'){isSwiping=false;player.setDirection(dx,dy);currentTouchButtonDirection.dx=dx;currentTouchButtonDirection.dy=dy;lastDirectionKey=null;if(e)e.preventDefault();}};
        const touchEndHandler=(e)=>{if(gameState==='playing'){if(currentTouchButtonDirection.dx!==0||currentTouchButtonDirection.dy!==0)player.setDirection(0,0);currentTouchButtonDirection.dx=0;currentTouchButtonDirection.dy=0;if(e)e.preventDefault();}};
        ['mousedown','touchstart'].forEach(evt=>{ btnUp.addEventListener(evt,e=>touchStartHandler(0,-1,e)); btnDown.addEventListener(evt,e=>touchStartHandler(0,1,e)); btnLeft.addEventListener(evt,e=>touchStartHandler(-1,0,e)); btnRight.addEventListener(evt,e=>touchStartHandler(1,0,e)); });
        ['mouseup','touchend','mouseleave'].forEach(evt=>{ btnUp.addEventListener(evt,touchEndHandler); btnDown.addEventListener(evt,touchEndHandler); btnLeft.addEventListener(evt,touchEndHandler); btnRight.addEventListener(evt,touchEndHandler); });
    }
    function windowResized() {
        const infoElem=document.getElementById('info-percentual'), dPadElem=document.getElementById('touch-controls');
        let infoH=0; if(infoElem)infoH=infoElem.offsetHeight+parseFloat(getComputedStyle(infoElem).marginBottom||0)+parseFloat(getComputedStyle(infoElem).paddingTop||0)+parseFloat(getComputedStyle(infoElem).paddingBottom||0);
        let dPadH=0; if(dPadElem)dPadH=dPadElem.offsetHeight+parseFloat(getComputedStyle(dPadElem).bottom||0)+10;
        const availH=windowHeight-infoH-dPadH; canvasWidth=floor(windowWidth*0.98/GRID_SIZE)*GRID_SIZE; canvasHeight=floor(availH/GRID_SIZE)*GRID_SIZE;
        if(canvasWidth<GRID_SIZE*20)canvasWidth=GRID_SIZE*20; if(canvasHeight<GRID_SIZE*15)canvasHeight=GRID_SIZE*15;
        resizeCanvas(canvasWidth,canvasHeight); COLS=floor(width/GRID_SIZE); ROWS=floor(height/GRID_SIZE);
        resetGame(); calculateBackgroundImageTransform();
    }
