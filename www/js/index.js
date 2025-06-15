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
    let isBackgroundImageTransformReady = false;

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
                    grid[this.x][this.y] = ST_TRAIL; 
                    this.trailPath.push({ x: this.x, y: this.y });
                    this.x = nextX; 
                    this.y = nextY;
                    this.trailPath.push({ x: this.x, y: this.y }); 
                    completeAreaFill(this.trailPath); 
                    this.isDrawingTrail = false;
                    this.trailPath = [];
                    grid[this.x][this.y] = ST_FILLED; 
                    this.dx = 0; 
                    this.dy = 0;
                } else if (nextCellState === ST_TRAIL) { 
                    console.log("Jogador cruzou a própria trilha!");
                    gameOver();
                    return;
                } else { 
                    grid[this.x][this.y] = ST_TRAIL; 
                    this.trailPath.push({ x: this.x, y: this.y });
                    this.x = nextX;
                    this.y = nextY;
                }
            } else { 
                if (nextCellState === ST_EMPTY) { 
                    this.isDrawingTrail = true;
                    this.trailPath = [{ x: this.x, y: this.y }]; 
                    this.x = nextX; 
                    this.y = nextY;
                } else { 
                    this.x = nextX;
                    this.y = nextY;
                }
            }
        }
      }

      draw() {
        fill(playerColor);
        noStroke();
        rect(this.x * GRID_SIZE, this.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
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

        floodFill(x + 1, y, targetState, replacementState);
        floodFill(x - 1, y, targetState, replacementState);
        floodFill(x, y + 1, targetState, replacementState);
        floodFill(x, y - 1, targetState, replacementState);
    }

    function completeAreaFill(trailPath) {
        if (trailPath.length < 3) { 
            for (let p of trailPath) {
                if (grid[p.x][p.y] === ST_TRAIL) grid[p.x][p.y] = ST_EMPTY; 
            }
            player.trailPath = [];
            player.isDrawingTrail = false;
            return;
        }
        
        let trailOriginalStates = trailPath.map(p => ({x: p.x, y: p.y, state: grid[p.x][p.y]}));
        for (let p of trailPath) {
            grid[p.x][p.y] = ST_FILLED;
        }

        let fillCandidates = [];
        for (let i = 0; i < trailPath.length -1; i++) { 
            const p1 = trailPath[i];
            const p2 = trailPath[i+1]; 
            let dx = p2.x - p1.x; 
            let dy = p2.y - p1.y;
            let side1X = p1.x - dy; let side1Y = p1.y + dx;
            let side2X = p1.x + dy; let side2Y = p1.y - dx;
            if (isValidForFillStart(side1X, side1Y)) fillCandidates.push({x: side1X, y: side1Y});
            if (isValidForFillStart(side2X, side2Y)) fillCandidates.push({x: side2X, y: side2Y});
             side1X = p2.x - dy;  side1Y = p2.y + dx;
             side2X = p2.x + dy;  side2Y = p2.y - dx;
             if (isValidForFillStart(side1X, side1Y)) fillCandidates.push({x: side1X, y: side1Y});
             if (isValidForFillStart(side2X, side2Y)) fillCandidates.push({x: side2X, y: side2Y});
        }
        fillCandidates = fillCandidates.filter((item, index, self) =>
            index === self.findIndex((t) => (t.x === item.x && t.y === item.y))
        );

        let filledSuccessfully = false;
        let areasChecked = new Set(); 

        for (let candidate of fillCandidates) {
            let candidateKey = `${candidate.x},${candidate.y}`;
            if (areasChecked.has(candidateKey) || grid[candidate.x][candidate.y] !== ST_EMPTY) continue;

            let potentialArea = getAreaIfFilled(candidate.x, candidate.y, ST_EMPTY);
            potentialArea.forEach(cell => areasChecked.add(`${cell.x},${cell.y}`)); 

            let enemyInArea = false;
            for (let enemy of enemies) { 
                let enemyGridX = floor(enemy.position.x / GRID_SIZE); 
                let enemyGridY = floor(enemy.position.y / GRID_SIZE); 
                if (potentialArea.some(cell => cell.x === enemyGridX && cell.y === enemyGridY)) {
                    enemyInArea = true;
                    break;
                }
            }

            if (!enemyInArea) {
                let scoreBeforeFill = score;
                floodFill(candidate.x, candidate.y, ST_EMPTY, ST_FILLED);
                if(score > scoreBeforeFill) filledSuccessfully = true; 
                break; 
            } else {
                console.log("Inimigo na área candidata, não preencheu de:", candidate);
            }
        }
        
        if (!filledSuccessfully) {
            console.log("Nenhuma área válida para preenchimento ou todas continham inimigos. Revertendo trilha para vazia.");
            for(let cell of trailOriginalStates){
                if(grid[cell.x][cell.y] === ST_FILLED && !(cell.x === 0 || cell.x === COLS -1 || cell.y === 0 || cell.y === ROWS -1)){
                    if(cell.state === ST_TRAIL) grid[cell.x][cell.y] = ST_EMPTY;
                }
            }
        }
        player.trailPath = [];
        player.isDrawingTrail = false;
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
        let tempGrid = grid.map(arr => arr.slice()); 

        while (q.length > 0) {
            let curr = q.shift();
            if (curr.x < 0 || curr.x >= COLS || curr.y < 0 || curr.y >= ROWS || 
                tempGrid[curr.x][curr.y] !== targetState) { 
                continue;
            }
            area.push(curr);
            tempGrid[curr.x][curr.y] = -1; 
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
      noStroke(); // Call noStroke once for the entire grid drawing
      for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < ROWS; j++) {
          let dx = i * GRID_SIZE;
          let dy = j * GRID_SIZE;

          if (grid[i][j] === ST_FILLED) {
            // Draw yellow underlay for ST_FILLED cells
            fill(yellowColor); 
            rect(dx, dy, GRID_SIZE, GRID_SIZE);

            if (isBackgroundImageTransformReady && backgroundImage && backgroundImage.width > 0 && backgroundImage.height > 0) {
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
                    console.log(`--- Debugging drawGrid cell[${i}][${j}] ---`);
                    console.log(`Canvas Cell (targetCanvasX,Y): ${targetCanvasX}, ${targetCanvasY}`);
                    console.log(`imageOffset (X,Y): ${imageOffsetX}, ${imageOffsetY}`);
                    console.log(`scaledImage (W,H): ${scaledImageWidth}, ${scaledImageHeight}`);
                    console.log(`imageScale: ${imageScale}`);
                    console.log(`originalImage (W,H): ${backgroundImage.width}, ${backgroundImage.height}`);
                    console.log(`Pre-clip (sx,sy): ${sx_before_clip}, ${sy_before_clip}`);
                    console.log(`Pre-clip (sWidth,sHeight): ${sWidth_before_clip}, ${sHeight_before_clip}`);
                }

                let sx = sx_before_clip;
                let sy = sy_before_clip;
                let sWidth = sWidth_before_clip;
                let sHeight = sHeight_before_clip;

                // Check if the cell is outside the visible area of the scaled, centered image
                // or if the source width/height is non-positive.
                if (targetCanvasX + targetCanvasWidth < imageOffsetX || // Cell is to the left of the image
                    targetCanvasX > imageOffsetX + scaledImageWidth ||  // Cell is to the right of the image
                    targetCanvasY + targetCanvasHeight < imageOffsetY || // Cell is above the image
                    targetCanvasY > imageOffsetY + scaledImageHeight || // Cell is below the image
                    sWidth <= 0 || sHeight <= 0) {
                    // This cell is outside the actual scaled image bounds on canvas,
                    // or the source dimensions are invalid. So, do nothing, leave it yellow.
                    if ( (i === 0 && j === 0) || (i === 1 && j === 1) || (i === Math.floor(COLS/2) && j === Math.floor(ROWS/2)) ) {
                        console.log(`Cell [${i}][${j}] determined to be outside image bounds or sWidth/sHeight <=0 initially. Remains yellow.`);
                    }
                } else {
                    // Further checks for sx, sy, sWidth, sHeight against original image dimensions
                    if (sx < 0) {
                        sWidth += sx; // Reduce width by the amount sx is negative (sx is negative)
                        sx = 0;
                    }
                    if (sy < 0) {
                        sHeight += sy; // Reduce height by the amount sy is negative (sy is negative)
                        sy = 0;
                    }

                    if (sx + sWidth > backgroundImage.width) {
                        sWidth = backgroundImage.width - sx;
                    }
                    if (sy + sHeight > backgroundImage.height) {
                        sHeight = backgroundImage.height - sy;
                    }

                    // Only draw if the adjusted source width/height are still positive
                    if (sWidth > 0 && sHeight > 0) {
                        if ( (i === 0 && j === 0) || (i === 1 && j === 1) || (i === Math.floor(COLS/2) && j === Math.floor(ROWS/2)) ) {
                            console.log(`Post-clip (sx,sy): ${sx}, ${sy}`);
                            console.log(`Post-clip (sWidth,sHeight): ${sWidth}, ${sHeight}`);
                        }
                        image(backgroundImage, 
                              dx, dy, targetCanvasWidth, targetCanvasHeight, // Destination on canvas
                              sx, sy, sWidth, sHeight);                    // Source from original image
                    } else {
                        if ( (i === 0 && j === 0) || (i === 1 && j === 1) || (i === Math.floor(COLS/2) && j === Math.floor(ROWS/2)) ) {
                            console.log(`Cell [${i}][${j}] sWidth or sHeight became <=0 after clipping. sx:${sx}, sy:${sy}, sW:${sWidth}, sH:${sHeight}. Stays yellow.`);
                        }
                    }
                }
            }
            // If backgroundImage is not loaded/valid or imageScale is invalid, the cell remains yellow.
            
          } else if (grid[i][j] === ST_EMPTY) {
            // ST_EMPTY cells are drawn with their specific color (dark blue/grey)
            fill(emptyColor);
            rect(dx, dy, GRID_SIZE, GRID_SIZE);
          } else if (grid[i][j] === ST_TRAIL) {
            // ST_TRAIL cells are drawn with their specific color
            fill(trailColor); 
            rect(dx, dy, GRID_SIZE, GRID_SIZE);
          }
        }
      }
    }

    function calculateBackgroundImageTransform() {
      isBackgroundImageTransformReady = false;
      if (!backgroundImage || backgroundImage.width === 0 || backgroundImage.height === 0) {
        console.log("calculateBackgroundImageTransform: backgroundImage not loaded or invalid.");
        return;
      }

      let canvasWidth = width; // p5.js global for canvas width
      let canvasHeight = height; // p5.js global for canvas height

      let imageAspect = backgroundImage.width / backgroundImage.height;
      let canvasAspect = canvasWidth / canvasHeight;

      if (imageAspect > canvasAspect) {
        // Image is wider relative to canvas, fit by width
        imageScale = canvasWidth / backgroundImage.width;
      } else {
        // Image is taller relative to canvas (or same aspect), fit by height
        imageScale = canvasHeight / backgroundImage.height;
      }

      scaledImageWidth = backgroundImage.width * imageScale;
      scaledImageHeight = backgroundImage.height * imageScale;

      imageOffsetX = (canvasWidth - scaledImageWidth) / 2;
      imageOffsetY = (canvasHeight - scaledImageHeight) / 2;

      console.log("Calculated background image transform:", {
          imageScale, scaledImageWidth, scaledImageHeight, imageOffsetX, imageOffsetY,
          canvasWidth, canvasHeight,
          imgActualWidth: backgroundImage.width, imgActualHeight: backgroundImage.height
      });
      isBackgroundImageTransformReady = true;
    }

    function resetGame() {
      initializeGrid();
      player = new Player(0, floor(ROWS / 2));
      grid[player.x][player.y] = ST_FILLED;
      player.isDrawingTrail = false;
      player.trailPath = [];
      player.dx = 0;
      player.dy = 0;
      score = 0; 
      percentualAreaExibido = 0; 
      if(elementoInfoPercentual) { 
          elementoInfoPercentual.innerHTML = `Área: ${percentualAreaExibido.toFixed(0)}%`;
      }


      enemies = [];
      for (let i = 0; i < NUM_ENEMIES; i++) {
        let enemyStartX, enemyStartY;
        let enemyGridX, enemyGridY;
        let attempts = 0;
        do { 
            enemyStartX = floor(random(GRID_SIZE * 4, width - GRID_SIZE * 4)); 
            enemyStartY = floor(random(GRID_SIZE * 4, height - GRID_SIZE * 4));
            enemyGridX = floor(enemyStartX / GRID_SIZE);
            enemyGridY = floor(enemyStartY / GRID_SIZE);
            attempts++;
            if (attempts > 100) { 
                console.error("Não foi possível posicionar o inimigo em área vazia.");
                enemyStartX = width/2; enemyStartY = height/2; 
                break;
            }
        } while (grid[enemyGridX] === undefined || grid[enemyGridX][enemyGridY] === undefined || grid[enemyGridX][enemyGridY] !== ST_EMPTY); 
        
        enemies.push(new Enemy(enemyStartX, enemyStartY)); 
      }
      gameState = 'playing';
      calculateBackgroundImageTransform(); // Ensure transform is calculated with latest dimensions
    }

    function gameOver() {
      gameState = 'gameOver';
      console.log("Game Over!");
    }
    
    function checkLevelComplete() {
        if (totalFillableCells === 0) {
            percentualAreaExibido = 0; 
        } else {
            percentualAreaExibido = (score / totalFillableCells) * 100; 
        }
        
        if(elementoInfoPercentual) { 
            elementoInfoPercentual.innerHTML = `Área: ${percentualAreaExibido.toFixed(0)}%`;
        }
        
        console.log(`Progresso: ${score} / ${totalFillableCells} = ${percentualAreaExibido.toFixed(2)}%`);
        
        if (percentualAreaExibido >= 75) {
            gameState = 'levelComplete';
            console.log("Nível Completo!");
        }
    }

    // --- Funções p5.js ---
    let lastDirectionKey = null; 
    let currentTouchButtonDirection = { dx: 0, dy: 0 }; 
    let cnv; 

    function setup() {
      splashScreenImage = document.getElementById('splashscreen-image');
      elementoInfoPercentual = document.getElementById('info-percentual');

      // *** AJUSTE NO CÁLCULO DA ALTURA DO CANVAS PARA MAXIMIZAR ÁREA ÚTIL ***
      const infoHeight = elementoInfoPercentual.offsetHeight + parseFloat(getComputedStyle(elementoInfoPercentual).marginBottom);
      const dPadEffectiveHeight = 100 + 10 + 10; // Altura D-Pad + margem superior + margem inferior (aproximado)
      const availableHeight = windowHeight - infoHeight - dPadEffectiveHeight;
      
      canvasWidth = floor(windowWidth * 0.98 / GRID_SIZE) * GRID_SIZE; // Quase 100% da largura
      canvasHeight = floor(availableHeight / GRID_SIZE) * GRID_SIZE; 
      
      // Mínimos para garantir jogabilidade
      if (canvasWidth < GRID_SIZE * 25) canvasWidth = GRID_SIZE * 25; 
      if (canvasHeight < GRID_SIZE * 20) canvasHeight = GRID_SIZE * 20; // Reduzido um pouco o mínimo da altura
      
      cnv = createCanvas(canvasWidth, canvasHeight); 
      cnv.mousePressed(handleCanvasTouchStart); 
      cnv.touchStarted(handleCanvasTouchStart); 

      console.log("Attempting to load image: img/fundo_01.png");
      backgroundImage = loadImage(
        'img/fundo_01.png',
        img => {
          console.log('Background image loaded successfully:', img.width, 'x', img.height);
          backgroundImage = img; // Assign to global
          calculateBackgroundImageTransform(); // Call here
        },
        err => {
          console.error('Failed to load background image:', err);
          backgroundImage = null; // Explicitly set to null on error
        }
      );

      COLS = floor(width / GRID_SIZE);
      ROWS = floor(height / GRID_SIZE);

      let playerBaseColor = SUPERNOVA_COLORS[Math.floor(random(SUPERNOVA_COLORS.length))];
      playerColor = color(playerBaseColor[0], playerBaseColor[1], playerBaseColor[2]);
      trailColor = color(playerBaseColor[0], playerBaseColor[1], playerBaseColor[2], 100);
      
      yellowColor = color(255, 255, 0); // Define yellow
      filledColor = color(50, 50, 70);
      emptyColor = color(10, 10, 20); // Reverted to original dark blue/grey
      
      angleMode(RADIANS); 
      setupTouchControls(); 
      // resetGame(); // Called after splash screen
      frameRate(30); 
    }

    function draw() {
      if (gameState === 'splashScreen') {
        // We don't need to draw anything on the canvas for the splash,
        // as it's an HTML overlay. We just count time.
        splashScreenTimer += deltaTime; // p5.js provides deltaTime

        if (splashScreenTimer >= SPLASH_DURATION) {
          if (splashScreenImage) {
            splashScreenImage.style.display = 'none';
          }
          gameState = 'playing';
          resetGame(); // Initialize the game after splash screen
        }
        // It's important to return here or ensure no other drawing happens
        // if the splash is active and you don't want the canvas visible yet.
        // However, since the splash is an overlay, the canvas will be drawn underneath.
        // If a black background is desired for the canvas during splash, it can be added.
        // background(0); // Optional: if you want to ensure canvas is black behind splash
        return; // Stop further drawing in this frame if splash is active
      }

      if (gameState === 'playing') {
        if (currentTouchButtonDirection.dx !== 0 || currentTouchButtonDirection.dy !== 0) {
            player.setDirection(currentTouchButtonDirection.dx, currentTouchButtonDirection.dy);
        }
        background(0); // Reverted to original black background
        drawGrid();
        player.update(); 
        player.draw();
        for (let enemy of enemies) {
          enemy.update(); 
          enemy.render(); 
        }

      } else if (gameState === 'gameOver') {
        background(50,0,0);
        drawRestartButton();
        fill(255); 
        textSize(width / 15); 
        textAlign(CENTER, CENTER);
        text("GAME OVER", width / 2, height / 2 - (GRID_SIZE * 4)); 
      } else if (gameState === 'levelComplete') {
        background(0,50,0);
        drawRestartButton("Jogar Novamente");
        fill(255);
        textSize(width / 15);
        textAlign(CENTER, CENTER);
        text("NÍVEL COMPLETO!", width / 2, height / 2 - (GRID_SIZE * 4)); 
      }
    }

    function drawRestartButton(label = "Reiniciar") {
        let btnW = width / 3;
        let btnH = GRID_SIZE * 5;
        let btnX = width / 2 - btnW / 2;
        let btnY = height / 2 + GRID_SIZE * 1; 

        restartButtonProps = { x: btnX, y: btnY, w: btnW, h: btnH, label: label };

        push();
        fill(100, 100, 200, 200); 
        stroke(200, 200, 255);
        strokeWeight(2);
        rect(restartButtonProps.x, restartButtonProps.y, restartButtonProps.w, restartButtonProps.h, 10); 

        fill(255);
        noStroke();
        textSize(GRID_SIZE * 2);
        textAlign(CENTER, CENTER);
        text(restartButtonProps.label, restartButtonProps.x + restartButtonProps.w / 2, restartButtonProps.y + restartButtonProps.h / 2);
        pop();
    }

    function handleCanvasTouchStart(event) { 
        if (gameState === 'playing') {
            let touchControlsDiv = document.getElementById('touch-controls');
            if (touchControlsDiv && touchControlsDiv.contains(event.target)) {
                return; 
            }
            touchStartX = mouseX; 
            touchStartY = mouseY; 
            isSwiping = true;
            currentTouchButtonDirection.dx = 0; 
            currentTouchButtonDirection.dy = 0;
            lastDirectionKey = null; 
        }
        if(event && typeof event.preventDefault === 'function') event.preventDefault(); 
        return false; 
    }

    function touchMoved(event) { 
        if (gameState === 'playing' && isSwiping) {
            let currentX = mouseX; 
            let currentY = mouseY; 

            let diffX = currentX - touchStartX;
            let diffY = currentY - touchStartY;

            if (abs(diffX) > swipeThreshold || abs(diffY) > swipeThreshold) {
                if (abs(diffX) > abs(diffY)) { 
                    player.setDirection(diffX > 0 ? 1 : -1, 0);
                } else { 
                    player.setDirection(0, diffY > 0 ? 1 : -1);
                }
                // *** ATUALIZA touchStartX/Y para permitir mudança de direção contínua ***
                touchStartX = currentX;
                touchStartY = currentY;
                
                lastDirectionKey = null; 
                currentTouchButtonDirection.dx = 0; 
                currentTouchButtonDirection.dy = 0;
            }
        }
        if(event && typeof event.preventDefault === 'function') event.preventDefault();
        return false; 
    }

    function touchEnded(event) { 
        if (isSwiping) { 
            isSwiping = false;
            // *** ADICIONADO: Para o jogador quando o swipe termina ***
            player.setDirection(0, 0);
        }
        if(event && typeof event.preventDefault === 'function') event.preventDefault();
        return false; 
    }
    function mouseReleased(event){ 
        touchEnded(event);
    }


    function keyPressed() {
      if (gameState !== 'playing') {
        return;
      }
      currentTouchButtonDirection.dx = 0; 
      currentTouchButtonDirection.dy = 0;
      isSwiping = false; 
      player.setDirection(0,0); 

      if (keyCode === UP_ARROW) { player.setDirection(0, -1); lastDirectionKey = UP_ARROW; }
      else if (keyCode === DOWN_ARROW) { player.setDirection(0, 1); lastDirectionKey = DOWN_ARROW; }
      else if (keyCode === LEFT_ARROW) { player.setDirection(-1, 0); lastDirectionKey = LEFT_ARROW; }
      else if (keyCode === RIGHT_ARROW) { player.setDirection(1, 0); lastDirectionKey = RIGHT_ARROW; }
      return false; 
    }

    function keyReleased() {
        if (gameState !== 'playing') return;
        if ( (keyCode === UP_ARROW    && player.dy === -1 && lastDirectionKey === UP_ARROW) ||
             (keyCode === DOWN_ARROW  && player.dy ===  1 && lastDirectionKey === DOWN_ARROW) ||
             (keyCode === LEFT_ARROW  && player.dx === -1 && lastDirectionKey === LEFT_ARROW) ||
             (keyCode === RIGHT_ARROW && player.dx ===  1 && lastDirectionKey === RIGHT_ARROW) ) {
            player.setDirection(0, 0); 
            lastDirectionKey = null;
        }
        return false;
    }

    function mousePressed(event) { 
        if (gameState === 'gameOver' || gameState === 'levelComplete') {
            if (mouseX > restartButtonProps.x && mouseX < restartButtonProps.x + restartButtonProps.w &&
                mouseY > restartButtonProps.y && mouseY < restartButtonProps.y + restartButtonProps.h) {
                resetGame();
                return; 
            }
        }
    }
    
    function setupTouchControls() {
        const btnUp = document.getElementById('btn-up');
        const btnDown = document.getElementById('btn-down');
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');

        const handleTouchButtonStart = (dx, dy, event) => {
            if (gameState === 'playing') {
                isSwiping = false; 
                player.setDirection(dx, dy); 
                currentTouchButtonDirection.dx = dx; 
                currentTouchButtonDirection.dy = dy;
                lastDirectionKey = null; 
                if(event) event.preventDefault();
            }
        };

        const handleTouchButtonEnd = (event) => {
            if (gameState === 'playing') {
                if (currentTouchButtonDirection.dx !== 0 || currentTouchButtonDirection.dy !== 0) {
                     player.setDirection(0, 0);
                }
                currentTouchButtonDirection.dx = 0;
                currentTouchButtonDirection.dy = 0;
                if(event) event.preventDefault();
            }
        };

        ['mousedown', 'touchstart'].forEach(evtType => {
            btnUp.addEventListener(evtType, (e) => handleTouchButtonStart(0, -1, e));
            btnDown.addEventListener(evtType, (e) => handleTouchButtonStart(0, 1, e));
            btnLeft.addEventListener(evtType, (e) => handleTouchButtonStart(-1, 0, e));
            btnRight.addEventListener(evtType, (e) => handleTouchButtonStart(1, 0, e));
        });

        ['mouseup', 'touchend', 'mouseleave'].forEach(evtType => { 
            btnUp.addEventListener(evtType, (e) => handleTouchButtonEnd(e));
            btnDown.addEventListener(evtType, (e) => handleTouchButtonEnd(e));
            btnLeft.addEventListener(evtType, (e) => handleTouchButtonEnd(e));
            btnRight.addEventListener(evtType, (e) => handleTouchButtonEnd(e));
        });
    }


    function windowResized() {
        isBackgroundImageTransformReady = false; // Reset flag on resize
        // *** AJUSTE NO CÁLCULO DA ALTURA DO CANVAS PARA MAXIMIZAR ÁREA ÚTIL ***
        const infoElem = document.getElementById('info-percentual');
        const dPadElem = document.getElementById('touch-controls');
        let infoHeight = 0;
        if (infoElem) {
            infoHeight = infoElem.offsetHeight + parseFloat(getComputedStyle(infoElem).marginBottom || 0) + parseFloat(getComputedStyle(infoElem).paddingTop || 0) + parseFloat(getComputedStyle(infoElem).paddingBottom || 0);
        }
        let dPadHeight = 0;
        if (dPadElem) {
            // Considera a altura do D-Pad e sua posição 'bottom' e um pouco de margem
             dPadHeight = dPadElem.offsetHeight + parseFloat(getComputedStyle(dPadElem).bottom || 0) + 10; // 10 para uma margem extra
        }

        const availableHeight = windowHeight - infoHeight - dPadHeight;
        
        canvasWidth = floor(windowWidth * 0.98 / GRID_SIZE) * GRID_SIZE; 
        canvasHeight = floor(availableHeight / GRID_SIZE) * GRID_SIZE; 
        
        if (canvasWidth < GRID_SIZE * 20) canvasWidth = GRID_SIZE * 20; 
        if (canvasHeight < GRID_SIZE * 15) canvasHeight = GRID_SIZE * 15; // Reduzido mínimo da altura um pouco
        
        resizeCanvas(canvasWidth, canvasHeight);
        COLS = floor(width / GRID_SIZE);
        ROWS = floor(height / GRID_SIZE);
        resetGame();
        calculateBackgroundImageTransform(); // Call after resize and game reset
    }
