// =========================================================
// 전시관 1: 《비단실의 궤적: 실크 아뜰리에 3D 가상 피팅 시뮬레이터》
// 9번 사진 진품 한복 + 직조 바탕/문양 선명화 + 우측 시야 확보 + 3D 볼륨 매듭 (v7)
// =========================================================

class SilkSimulator {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.canvas = document.getElementById('three-canvas');
    
    // 시뮬레이터 상태값
    this.state = {
      outfitStyle: 'hanbok',  // 기본: 기품 있는 전통 모던 한복
      colorTarget: 'chima',   // 'chima' (치마) 또는 'jeogori' (저고리)
      chimaColor: 0x1b2d4f,   // 9번 사진의 깊이 있고 기품 있는 짙은 남색 (Navy Silk)
      chimaColorName: '심해 인디고 (Deep Navy)',
      jeogoriColor: 0xfdfbf7, // 9번 사진의 단아한 백옥 미색 (Ivory Silk)
      jeogoriColorName: '백옥 미색 (Pure Pearl)',
      weaveStyle: 'smooth',   // 직조 스타일
      patternStyle: 'none',   // 문양 스타일
      maedeupScale: 1.0,      // 매듭 크기 배율
      isAutoRotate: true,
      lightingMode: 'studio',
      attachedMaedeups: []
    };

    // 회전 물리
    this.physics = {
      prevRotationY: 0,
      skirtFlare: 0
    };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initThree();
    this.buildOutfit();
    this.createFiberOpticParticles();
    this.setupLighting();
    this.bindEvents();
    this.setupDragAndDrop();
    this.animate();
  }

  initThree() {
    if (typeof THREE === 'undefined') {
      console.warn('Three.js CDN 로딩 대기 또는 오프라인 환경 - 2.5D 고화질 캔버스 모드로 작동');
      this.initFallback2D();
      return;
    }

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || (window.innerHeight - 68);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e1f1a);
    this.scene.fog = new THREE.FogExp2(0x0e1f1a, 0.015);

    // Camera - 4번 사진 해결: 툴바에 가려지지 않도록 모델 중심을 우측(x: 0.55)으로 설정
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0.55, 0.85, 4.4);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.75;

    // Controls - 타겟을 우측 중심(0.55, 0.55, 0)으로 맞춰 툴바와 전혀 겹치지 않게 배치!
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
      this.controls.minDistance = 2.0;
      this.controls.maxDistance = 7.0;
      this.controls.target.set(0.55, 0.55, 0);
    }

    this.createPedestal();
    this.createStudioBackdrop();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initFallback2D() {
    this.isFallback = true;
    const ctx = this.canvas.getContext('2d');
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || (window.innerHeight - 68);
    this.canvas.width = width;
    this.canvas.height = height;

    let rot = 0;
    const draw = () => {
      if (!this.isFallback) return;
      ctx.fillStyle = '#0e1f1a';
      ctx.fillRect(0, 0, width, height);

      const cx = width * 0.62; // 우측 배치
      const cy = height / 2 + 30;

      ctx.fillStyle = 'rgba(212, 175, 55, 0.3)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 180, 160, 40, 0, 0, Math.PI * 2);
      ctx.fill();

      rot += 0.02;
      ctx.save();
      ctx.translate(cx, cy);

      const grad = ctx.createLinearGradient(0, -150, 0, 180);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#' + this.state.chimaColor.toString(16).padStart(6, '0'));
      grad.addColorStop(1, '#' + this.state.chimaColor.toString(16).padStart(6, '0'));

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-20, -140);
      ctx.bezierCurveTo(40, -100, -50 + Math.sin(rot) * 15, 0, -120 + Math.cos(rot) * 20, 160);
      ctx.bezierCurveTo(0, 190, 60, 190, 130 + Math.sin(rot) * 20, 160);
      ctx.bezierCurveTo(60 + Math.cos(rot) * 15, 0, -20, -100, 20, -140);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
      requestAnimationFrame(draw);
    };
    draw();
  }

  createPedestal() {
    // 받침대도 x: 0.55에 정렬
    const baseGeo = new THREE.CylinderGeometry(1.5, 1.6, 0.12, 64);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x142822,
      metalness: 0.6,
      roughness: 0.3
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0.55, -1.2, 0);
    this.scene.add(baseMesh);

    const ringGeo = new THREE.RingGeometry(1.3, 1.48, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(0.55, -1.13, 0);
    this.scene.add(ringMesh);
  }

  createStudioBackdrop() {
    const glowGeo = new THREE.PlaneGeometry(8, 8);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(80, 160, 130, 0.25)');
    grad.addColorStop(0.6, 'rgba(20, 50, 40, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const glowTex = new THREE.CanvasTexture(canvas);
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.set(0.55, 0.8, -1.8);
    this.scene.add(glowMesh);
  }

  // 의상 빌드
  buildOutfit() {
    if (this.outfitGroup) {
      this.scene.remove(this.outfitGroup);
    }

    this.outfitGroup = new THREE.Group();
    // 툴바에 가려지지 않도록 전체 의상 그룹을 x: 0.55로 위치시킴!
    this.outfitGroup.position.set(0.55, 0, 0);

    // 마네킹 기둥
    const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.5, 16);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.2 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 0.1;
    this.outfitGroup.add(pole);

    // 9번 사진 천연 실크 직물 셰이더 (Fabric Sheen)
    this.chimaMaterial = new THREE.MeshPhysicalMaterial({
      color: this.state.chimaColor,
      roughness: 0.32,
      metalness: 0.05,
      clearcoat: 0.55,
      clearcoatRoughness: 0.25,
      ior: 1.48,
      side: THREE.DoubleSide
    });

    this.jeogoriMaterial = new THREE.MeshPhysicalMaterial({
      color: this.state.jeogoriColor,
      roughness: 0.30,
      metalness: 0.05,
      clearcoat: 0.50,
      clearcoatRoughness: 0.22,
      ior: 1.48,
      side: THREE.DoubleSide
    });

    if (this.state.outfitStyle === 'hanbok') {
      this.createAuthenticHanbokGeometry();
    } else {
      this.createCleanDressGeometry();
    }

    this.updateCombinedTexture();
    this.rebuildAttachedMaedeups();

    this.scene.add(this.outfitGroup);
  }

  // 9번 사진 전통 한복 완벽 구현
  createAuthenticHanbokGeometry() {
    this.interactableMeshes = [];

    // 1) 치마 (Chima) - 96 세그먼트 스무스 항아리 라인
    const chimaPoints = [];
    chimaPoints.push(new THREE.Vector2(0.25, 0.95));
    chimaPoints.push(new THREE.Vector2(0.56, 0.76));
    chimaPoints.push(new THREE.Vector2(0.98, 0.25));
    chimaPoints.push(new THREE.Vector2(1.18, -0.45));
    chimaPoints.push(new THREE.Vector2(1.28, -1.05));
    chimaPoints.push(new THREE.Vector2(1.30, -1.18));

    this.chimaGeo = new THREE.LatheGeometry(chimaPoints, 96);
    this.originalChimaPositions = this.chimaGeo.attributes.position.clone();

    const pos = this.chimaGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const angle = Math.atan2(pos.getZ(i), pos.getX(i));
      const pleat = Math.sin(angle * 32) * 0.022 * (1.0 - y);
      pos.setX(i, pos.getX(i) + Math.cos(angle) * pleat);
      pos.setZ(i, pos.getZ(i) + Math.sin(angle) * pleat);
    }
    this.chimaGeo.computeVertexNormals();

    this.chimaMesh = new THREE.Mesh(this.chimaGeo, this.chimaMaterial);
    this.outfitGroup.add(this.chimaMesh);
    this.interactableMeshes.push(this.chimaMesh);

    // 2) 저고리 몸판
    const jeogoriGeo = new THREE.CylinderGeometry(0.20, 0.26, 0.48, 64);
    this.jeogoriMesh = new THREE.Mesh(jeogoriGeo, this.jeogoriMaterial);
    this.jeogoriMesh.position.y = 1.20;
    this.outfitGroup.add(this.jeogoriMesh);
    this.interactableMeshes.push(this.jeogoriMesh);

    // 3) 어깨에서 차분하게 아래로 수직으로 떨어지는 얌전한 소매
    const leftSleeveCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.19, 1.40, 0.0),
      new THREE.Vector3(-0.32, 1.25, 0.02),
      new THREE.Vector3(-0.38, 0.98, 0.03),
      new THREE.Vector3(-0.36, 0.65, 0.02)
    ]);
    const leftSleeveGeo = new THREE.TubeGeometry(leftSleeveCurve, 32, 0.085, 24, false);
    const leftSleeveMesh = new THREE.Mesh(leftSleeveGeo, this.jeogoriMaterial);
    this.outfitGroup.add(leftSleeveMesh);

    // 소매 끝동 흰색 거들지
    const leftCuffGeo = new THREE.CylinderGeometry(0.09, 0.092, 0.08, 24);
    const cuffMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const leftCuffMesh = new THREE.Mesh(leftCuffGeo, cuffMat);
    leftCuffMesh.position.set(-0.36, 0.62, 0.02);
    this.outfitGroup.add(leftCuffMesh);

    const rightSleeveCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.19, 1.40, 0.0),
      new THREE.Vector3(0.32, 1.25, 0.02),
      new THREE.Vector3(0.38, 0.98, 0.03),
      new THREE.Vector3(0.36, 0.65, 0.02)
    ]);
    const rightSleeveGeo = new THREE.TubeGeometry(rightSleeveCurve, 32, 0.085, 24, false);
    const rightSleeveMesh = new THREE.Mesh(rightSleeveGeo, this.jeogoriMaterial);
    this.outfitGroup.add(rightSleeveMesh);

    const rightCuffMesh = new THREE.Mesh(leftCuffGeo, cuffMat);
    rightCuffMesh.position.set(0.36, 0.62, 0.02);
    this.outfitGroup.add(rightCuffMesh);

    // 4) 깃 & 동정
    const collarGeo = new THREE.TorusGeometry(0.19, 0.022, 20, 48, Math.PI);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x1b2d4f, roughness: 0.25 });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.rotation.x = Math.PI / 2.2;
    collarMesh.position.set(0, 1.44, 0.04);
    this.outfitGroup.add(collarMesh);

    const innerDongjeong = new THREE.TorusGeometry(0.185, 0.012, 16, 48, Math.PI);
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const innerMesh = new THREE.Mesh(innerDongjeong, innerMat);
    innerMesh.rotation.x = Math.PI / 2.2;
    innerMesh.position.set(0, 1.455, 0.045);
    this.outfitGroup.add(innerMesh);

    // 5) 저고리 옷고름 매듭과 자락
    const knotKnotGeo = new THREE.TorusGeometry(0.042, 0.018, 16, 24);
    const goreumMat = new THREE.MeshPhysicalMaterial({
      color: 0x1b2d4f,
      roughness: 0.25,
      clearcoat: 0.6
    });
    const knotMesh = new THREE.Mesh(knotKnotGeo, goreumMat);
    knotMesh.position.set(0.04, 1.20, 0.24);
    knotMesh.rotation.y = -0.15;
    this.outfitGroup.add(knotMesh);

    const ribbon1Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.04, 1.20, 0.25),
      new THREE.Vector3(0.06, 0.85, 0.35),
      new THREE.Vector3(0.07, 0.35, 0.45),
      new THREE.Vector3(0.06, -0.40, 0.55),
      new THREE.Vector3(0.05, -0.90, 0.60)
    ]);
    const ribbon1Geo = new THREE.TubeGeometry(ribbon1Curve, 36, 0.028, 16, false);
    const ribbon1Mesh = new THREE.Mesh(ribbon1Geo, goreumMat);
    this.outfitGroup.add(ribbon1Mesh);

    const ribbon2Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, 1.18, 0.25),
      new THREE.Vector3(0.03, 0.90, 0.33),
      new THREE.Vector3(0.04, 0.55, 0.40),
      new THREE.Vector3(0.03, -0.20, 0.50)
    ]);
    const ribbon2Geo = new THREE.TubeGeometry(ribbon2Curve, 24, 0.025, 16, false);
    const ivoryMat = new THREE.MeshPhysicalMaterial({ color: 0xf5eedc, roughness: 0.25 });
    const ribbon2Mesh = new THREE.Mesh(ribbon2Geo, ivoryMat);
    this.outfitGroup.add(ribbon2Mesh);
  }

  // 서양 드레스
  createCleanDressGeometry() {
    this.interactableMeshes = [];

    const points = [];
    points.push(new THREE.Vector2(0.18, 1.55));
    points.push(new THREE.Vector2(0.28, 1.35));
    points.push(new THREE.Vector2(0.20, 0.95));
    points.push(new THREE.Vector2(0.42, 0.5));
    points.push(new THREE.Vector2(0.85, -0.2));
    points.push(new THREE.Vector2(1.35, -1.05));
    points.push(new THREE.Vector2(1.45, -1.18));

    this.chimaGeo = new THREE.LatheGeometry(points, 96);
    this.originalChimaPositions = this.chimaGeo.attributes.position.clone();

    const pos = this.chimaGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const angle = Math.atan2(pos.getZ(i), pos.getX(i));
      if (y < 0.6) {
        const wave = Math.sin(angle * 8) * 0.07 * (0.8 - y);
        pos.setX(i, pos.getX(i) + Math.cos(angle) * wave);
        pos.setZ(i, pos.getZ(i) + Math.sin(angle) * wave);
      }
    }
    this.chimaGeo.computeVertexNormals();

    this.chimaMesh = new THREE.Mesh(this.chimaGeo, this.chimaMaterial);
    this.outfitGroup.add(this.chimaMesh);
    this.interactableMeshes.push(this.chimaMesh);
  }

  // 치마 회전 물리
  updateDynamicSkirtPhysics() {
    if (!this.chimaMesh || !this.originalChimaPositions) return;

    const deltaRot = this.outfitGroup.rotation.y - this.physics.prevRotationY;
    this.physics.prevRotationY = this.outfitGroup.rotation.y;
    
    const targetFlare = Math.min(1.0, Math.abs(deltaRot) * 25.0);
    this.physics.skirtFlare += (targetFlare - this.physics.skirtFlare) * 0.12;

    const flare = this.physics.skirtFlare;
    if (flare < 0.005) return;

    const pos = this.chimaGeo.attributes.position;
    const orig = this.originalChimaPositions;
    const time = Date.now() * 0.005;

    for (let i = 0; i < pos.count; i++) {
      const y = orig.getY(i);
      if (y < 0.4) {
        const factor = (0.4 - y) * 1.5;
        const ox = orig.getX(i);
        const oz = orig.getZ(i);
        const angle = Math.atan2(oz, ox);
        
        const flareDist = flare * 0.35 * factor;
        const flutter = Math.sin(angle * 6 + time) * 0.04 * flare * factor;

        pos.setX(i, ox + Math.cos(angle) * (flareDist + flutter));
        pos.setZ(i, oz + Math.sin(angle) * (flareDist + flutter));
      }
    }
    this.chimaGeo.computeVertexNormals();
    this.chimaGeo.attributes.position.needsUpdate = true;
  }

  // ★ 4번 사진 해결: 직조 조직은 은은한 바탕 결로 깔고, 문양은 그 위에 선명하게 수놓는 2중 층위 렌더링!
  updateCombinedTexture() {
    const weave = this.state.weaveStyle;
    const pattern = this.state.patternStyle;

    if (weave === 'smooth' && pattern === 'none') {
      this.chimaMaterial.map = null;
      this.chimaMaterial.needsUpdate = true;
      if (this.jeogoriMaterial) {
        this.jeogoriMaterial.map = null;
        this.jeogoriMaterial.needsUpdate = true;
      }
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1024, 1024);

    // [1단계: 직조 조직 레이어] - 거친 체크판이 아닌, 은은하고 미세한 실제 직물 결 (Fine Weave Texture)
    if (weave === 'basket') {
      // 촘촘하고 은은한 바구니 직포 결 (투명도 8%로 은은하게 깔아 문양을 절대 방해하지 않음)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
      const s = 16;
      for (let x = 0; x < 1024; x += s * 2) {
        for (let y = 0; y < 1024; y += s * 2) {
          ctx.fillRect(x, y, s, s);
          ctx.fillRect(x + s, y + s, s, s);
        }
      }
    } else if (weave === 'matt_rib') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 3;
      for (let y = 0; y < 1024; y += 18) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
      }
    } else if (weave === 'houndstooth') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
      const s = 24;
      for (let x = 0; x < 1024; x += s * 2) {
        for (let y = 0; y < 1024; y += s * 2) {
          ctx.fillRect(x, y, s, s);
        }
      }
    }

    // [2단계: 전통 문양 레이어] - ★ 4번 사진 해결: 직조 위로 확실히 올라오는 선명한 황금빛 자수 & 금박!
    if (pattern === 'chokseok') {
      // 진주 촉석루 처마선 (선명한 금박 라인)
      ctx.strokeStyle = 'rgba(255, 225, 120, 0.95)';
      ctx.lineWidth = 5;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 6;
      for (let x = 0; x < 1024; x += 128) {
        for (let y = 0; y < 1024; y += 128) {
          ctx.beginPath();
          ctx.moveTo(x + 20, y + 90);
          ctx.quadraticCurveTo(x + 64, y + 20, x + 108, y + 90);
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;
    } else if (pattern === 'floral') {
      // 은은한 궁중 꽃자수
      ctx.fillStyle = 'rgba(255, 235, 160, 0.95)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2.5;
      for (let x = 60; x < 1024; x += 180) {
        for (let y = 60; y < 1024; y += 180) {
          for (let p = 0; p < 5; p++) {
            const rad = (p * Math.PI * 2) / 5;
            ctx.beginPath();
            ctx.arc(x + Math.cos(rad) * 22, y + Math.sin(rad) * 22, 12, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
          }
          ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff'; ctx.fill();
          ctx.fillStyle = 'rgba(255, 235, 160, 0.95)';
        }
      }
    } else if (pattern === 'plum') {
      // 진주 매화문
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = 'rgba(255, 215, 100, 0.8)';
      ctx.lineWidth = 3;
      for (let x = 70; x < 1024; x += 160) {
        for (let y = 70; y < 1024; y += 160) {
          ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 4);

    this.chimaMaterial.map = tex;
    this.chimaMaterial.needsUpdate = true;
    if (this.jeogoriMaterial) {
      this.jeogoriMaterial.map = tex;
      this.jeogoriMaterial.needsUpdate = true;
    }
  }

  // 진짜 3D 입체 매듭 지오메트리
  create3DVolumetricMaedeup(type, scale = 1.0) {
    const maedeupGroup = new THREE.Group();
    const s = 0.09 * scale;

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.6,
      roughness: 0.25
    });

    const pinkMat = new THREE.MeshStandardMaterial({
      color: 0xff477e,
      roughness: 0.3
    });

    const jadeMat = new THREE.MeshStandardMaterial({
      color: 0x38b2ac,
      roughness: 0.25
    });

    if (type === 'gukwa') {
      const ringGeo = new THREE.TorusGeometry(s * 1.0, s * 0.22, 16, 32);
      for (let i = 0; i < 4; i++) {
        const r = (i * Math.PI) / 4;
        const m = new THREE.Mesh(ringGeo, goldMat);
        m.rotation.z = r;
        maedeupGroup.add(m);
      }
      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.15, s * 0.08, s * 2.2, 12), goldMat);
      tassel.position.y = -s * 1.5;
      maedeupGroup.add(tassel);

    } else if (type === 'nabi') {
      const wingGeo = new THREE.TorusGeometry(s * 0.9, s * 0.18, 16, 32);
      const leftWing = new THREE.Mesh(wingGeo, pinkMat);
      leftWing.position.x = -s * 0.7; leftWing.rotation.y = 0.2;
      maedeupGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, pinkMat);
      rightWing.position.x = s * 0.7; rightWing.rotation.y = -0.2;
      maedeupGroup.add(rightWing);

      const centerSphere = new THREE.Mesh(new THREE.SphereGeometry(s * 0.32, 16, 16), pinkMat);
      maedeupGroup.add(centerSphere);

      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.12, s * 0.05, s * 2.0, 12), pinkMat);
      tassel.position.y = -s * 1.4;
      maedeupGroup.add(tassel);

    } else if (type === 'maehwa') {
      const petalGeo = new THREE.TorusGeometry(s * 0.5, s * 0.15, 12, 24);
      for (let i = 0; i < 5; i++) {
        const rad = (i * Math.PI * 2) / 5;
        const petal = new THREE.Mesh(petalGeo, jadeMat);
        petal.position.set(Math.cos(rad) * s * 0.6, Math.sin(rad) * s * 0.6, 0);
        maedeupGroup.add(petal);
      }
      const center = new THREE.Mesh(new THREE.SphereGeometry(s * 0.25, 12, 12), goldMat);
      maedeupGroup.add(center);

    } else if (type === 'ribbon') {
      const loopGeo = new THREE.TorusGeometry(s * 0.8, s * 0.2, 16, 32);
      const leftLoop = new THREE.Mesh(loopGeo, goldMat);
      leftLoop.position.x = -s * 0.6; leftLoop.rotation.z = -0.3;
      maedeupGroup.add(leftLoop);

      const rightLoop = new THREE.Mesh(loopGeo, goldMat);
      rightLoop.position.x = s * 0.6; rightLoop.rotation.z = 0.3;
      maedeupGroup.add(rightLoop);

      const centerKnot = new THREE.Mesh(new THREE.SphereGeometry(s * 0.3, 16, 16), goldMat);
      maedeupGroup.add(centerKnot);
    } else {
      const knotMesh = new THREE.Mesh(new THREE.TorusKnotGeometry(s * 0.8, s * 0.18, 64, 16), goldMat);
      maedeupGroup.add(knotMesh);
    }

    return maedeupGroup;
  }

  // 매듭 부착 - 의상 표면 바로 앞(z: +0.08)에 완벽 부착
  attachMaedeup(type, position3D) {
    const maedeupMesh = this.create3DVolumetricMaedeup(type, this.state.maedeupScale);
    maedeupMesh.position.copy(position3D);
    maedeupMesh.position.z += 0.08;

    this.outfitGroup.add(maedeupMesh);

    const names = {
      gukwa: '금빛 국화 매듭',
      nabi: '분홍 나비 매듭',
      maehwa: '청록 매화 매듭',
      dorae: '도래 매듭',
      ribbon: '클래식 비단 리본'
    };

    const item = {
      id: Date.now(),
      type: type,
      name: names[type] || '매듭 장식',
      position: position3D,
      mesh: maedeupMesh
    };

    this.state.attachedMaedeups.push(item);
    this.renderAttachedListUI();
  }

  // 원클릭 추천 위치 매듭 장식 (드래그가 어려운 사용자 편의 기능)
  attachPresetMaedeup(type, spot = 'chest') {
    let pos = new THREE.Vector3(0.06, 1.02, 0.28);
    if (spot === 'waist') pos = new THREE.Vector3(0.10, 0.72, 0.42);
    else if (spot === 'skirt') pos = new THREE.Vector3(0.35, 0.10, 0.88);

    this.attachMaedeup(type, pos);
  }

  setMaedeupScale(scale) {
    this.state.maedeupScale = scale;
    this.rebuildAttachedMaedeups();
  }

  removeMaedeup(id) {
    const idx = this.state.attachedMaedeups.findIndex(m => m.id === id);
    if (idx !== -1) {
      const item = this.state.attachedMaedeups[idx];
      this.outfitGroup.remove(item.mesh);
      this.state.attachedMaedeups.splice(idx, 1);
      this.renderAttachedListUI();
    }
  }

  rebuildAttachedMaedeups() {
    this.state.attachedMaedeups.forEach(item => {
      this.outfitGroup.remove(item.mesh);
      item.mesh = this.create3DVolumetricMaedeup(item.type, this.state.maedeupScale);
      item.mesh.position.copy(item.position);
      item.mesh.position.z += 0.08;
      this.outfitGroup.add(item.mesh);
    });
  }

  renderAttachedListUI() {
    const container = document.getElementById('attached-maedeup-box');
    if (!container) return;

    if (this.state.attachedMaedeups.length === 0) {
      container.innerHTML = '<span style="font-size: 0.72rem; color: #9fb3ab;">부착된 매듭 없음 (원하는 매듭을 드래그해 놓으세요)</span>';
      return;
    }

    container.innerHTML = this.state.attachedMaedeups.map(item => `
      <div class="maedeup-badge">
        <span>${item.name}</span>
        <button onclick="window.simulatorApp.removeMaedeup(${item.id})">✕</button>
      </div>
    `).join('');
  }

  setupDragAndDrop() {
    window.simulatorApp = this;

    const chips = document.querySelectorAll('.maedeup-chip');
    chips.forEach(chip => {
      chip.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', chip.dataset.maedeup);
      });
    });

    this.canvas.addEventListener('dragover', (e) => e.preventDefault());

    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      const maedeupType = e.dataTransfer.getData('text/plain');
      if (!maedeupType) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.mouse.set(x, y);
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const intersects = this.raycaster.intersectObjects(this.interactableMeshes || [this.chimaMesh]);
      if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        const localPoint = this.outfitGroup.worldToLocal(hitPoint.clone());
        this.attachMaedeup(maedeupType, localPoint);
      } else {
        this.attachMaedeup(maedeupType, new THREE.Vector3(0.06, 1.02, 0.28));
      }
    });
  }

  createFiberOpticParticles() {
    const particleCount = 700;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const baseColor = new THREE.Color(0xfff5d8);

    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const angle = t * Math.PI * 14;
      const radius = 0.32 + (1.25 - t * 1.8) * 0.72;
      const y = -1.1 + t * 2.7;

      positions[i * 3] = 0.55 + Math.cos(angle) * Math.max(0.2, radius);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * Math.max(0.2, radius);

      colors[i * 3] = baseColor.r;
      colors[i * 3 + 1] = baseColor.g;
      colors[i * 3 + 2] = baseColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,225,140,0.85)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const pTex = new THREE.CanvasTexture(canvas);

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.065,
      map: pTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, this.particleMaterial);
    this.scene.add(this.particles);
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(this.ambientLight);

    this.spotLight = new THREE.SpotLight(0xfff8ee, 3.8, 20, Math.PI / 3.5, 0.35, 1);
    this.spotLight.position.set(3.0, 4.5, 3.8);
    this.scene.add(this.spotLight);

    this.fillLight = new THREE.DirectionalLight(0xfff0dd, 1.6);
    this.fillLight.position.set(-2.0, 2.0, 3.5);
    this.scene.add(this.fillLight);

    this.internalLight = new THREE.PointLight(this.state.chimaColor, 2.5, 4.0);
    this.internalLight.position.set(0.55, 0.6, 0.2);
    this.scene.add(this.internalLight);

    this.rimLight = new THREE.DirectionalLight(0x70b090, 1.4);
    this.rimLight.position.set(0.55, 3.0, -3.5);
    this.scene.add(this.rimLight);
  }

  // 의상 스타일 전환 (서양 드레스일 때 저고리 색상 칸 숨김)
  setOutfitStyle(style) {
    this.state.outfitStyle = style;
    this.buildOutfit();
    const label = document.getElementById('val-style');
    if (label) {
      label.innerText = style === 'hanbok' ? '전통 모던 한복 (저고리+치마)' : '서양 이브닝 드레스';
    }

    const partToggle = document.getElementById('part-color-toggle-box');
    if (partToggle) {
      if (style === 'dress') {
        partToggle.classList.add('hidden');
        this.state.colorTarget = 'chima';
      } else {
        partToggle.classList.remove('hidden');
      }
    }
  }

  setColor(hex, name) {
    if (this.state.colorTarget === 'chima' || this.state.outfitStyle === 'dress') {
      this.state.chimaColor = hex;
      this.state.chimaColorName = name;
      if (this.chimaMaterial) this.chimaMaterial.color.setHex(hex);
      if (this.internalLight) this.internalLight.color.setHex(hex);
      const chimaLabel = document.getElementById('val-color-chima');
      if (chimaLabel) chimaLabel.innerText = name;
    } else {
      this.state.jeogoriColor = hex;
      this.state.jeogoriColorName = name;
      if (this.jeogoriMaterial) this.jeogoriMaterial.color.setHex(hex);
      const jeogoriLabel = document.getElementById('val-color-jeogori');
      if (jeogoriLabel) jeogoriLabel.innerText = name;
    }
  }

  setWeaveStyle(weave) {
    this.state.weaveStyle = weave;
    const names = {
      smooth: '단색 매끄러운 비단 (Smooth Silk)',
      organza: '진주 노방 오간자 (은은한 실크)',
      basket: '바구니 조직 (Basket Weave)',
      matt_rib: '매트 골 조직 (Matt Rib Weave)',
      houndstooth: '하운드투스 조직 (Houndstooth)'
    };
    const fabricLabel = document.getElementById('val-fabric');
    if (fabricLabel) fabricLabel.innerText = names[weave] || '궁중 비단';
    this.updateCombinedTexture();
  }

  setPatternStyle(pattern) {
    this.state.patternStyle = pattern;
    const names = {
      none: '문양 없음 (순수 직조 솔리드)',
      floral: '전시 비단 은은한 꽃자수',
      chokseok: '진주 촉석루 처마선',
      plum: '진주 매화문'
    };
    const label = document.getElementById('val-pattern');
    if (label) label.innerText = names[pattern] || pattern;
    this.updateCombinedTexture();
  }

  cycleLighting() {
    if (this.state.lightingMode === 'studio') {
      this.state.lightingMode = 'bright';
      this.renderer.toneMappingExposure = 2.1;
      this.ambientLight.intensity = 1.2;
      this.spotLight.intensity = 4.2;
      document.getElementById('btn-lighting-text').innerText = '조명: 런웨이 하이라이트';
    } else if (this.state.lightingMode === 'bright') {
      this.state.lightingMode = 'night';
      this.renderer.toneMappingExposure = 1.4;
      this.ambientLight.intensity = 0.45;
      this.spotLight.intensity = 2.0;
      this.internalLight.intensity = 4.5;
      document.getElementById('btn-lighting-text').innerText = '조명: 미디어아트 야간';
    } else {
      this.state.lightingMode = 'studio';
      this.renderer.toneMappingExposure = 1.75;
      this.ambientLight.intensity = 0.95;
      this.spotLight.intensity = 3.8;
      this.internalLight.intensity = 2.5;
      document.getElementById('btn-lighting-text').innerText = '조명: 박물관 갤러리';
    }
  }

  toggleAutoRotate() {
    this.state.isAutoRotate = !this.state.isAutoRotate;
    const btn = document.getElementById('btn-rotate');
    if (this.state.isAutoRotate) btn?.classList.add('active');
    else btn?.classList.remove('active');
  }

  resetZoom() {
    this.camera.position.set(0.55, 0.85, 4.4);
    if (this.controls) this.controls.target.set(0.55, 0.55, 0);
  }

  captureLookbook() {
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 900;
    exportCanvas.height = 1200;
    const ctx = exportCanvas.getContext('2d');

    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1200);
    bgGrad.addColorStop(0, '#0c1b17');
    bgGrad.addColorStop(1, '#1b3a31');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 900, 1200);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 50, 120, 800, 850);

      ctx.fillStyle = '#d4af37';
      ctx.font = 'bold 24px Pretendard, sans-serif';
      ctx.fillText('JINJU SILK MUSEUM', 60, 70);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px Pretendard, sans-serif';
      ctx.fillText('실크 아뜰리에 3D 가상 피팅 룩북', 60, 110);

      ctx.fillStyle = 'rgba(19, 43, 36, 0.85)';
      ctx.fillRect(50, 990, 800, 160);

      ctx.fillStyle = '#d4af37';
      ctx.font = 'bold 20px Pretendard, sans-serif';
      const styleName = this.state.outfitStyle === 'hanbok' ? '전통 모던 한복 세트' : '서양 이브닝 드레스';
      const maedeupNames = this.state.attachedMaedeups.map(m => m.name).join(', ') || '전통 나비 고름 매듭';
      ctx.fillText(`스타일: ${styleName} | 매듭: ${maedeupNames}`, 80, 1035);
      ctx.fillText(`치마: ${this.state.chimaColorName} | 저고리: ${this.state.jeogoriColorName}`, 80, 1075);
      
      ctx.fillStyle = '#a0aec0';
      ctx.font = '16px Pretendard, sans-serif';
      ctx.fillText(`직조: ${document.getElementById('val-fabric').innerText} | 진주실크박물관 디지털 아카이브`, 80, 1115);

      const finalUrl = exportCanvas.toDataURL('image/png');
      const modalImg = document.getElementById('lookbook-preview-img');
      modalImg.src = finalUrl;

      const downloadLink = document.getElementById('lookbook-download-btn');
      downloadLink.href = finalUrl;
      downloadLink.download = `Jinju_Silk_Lookbook_${Date.now()}.png`;

      document.getElementById('lookbook-modal').style.display = 'flex';
    };
    img.src = dataUrl;
  }

  bindEvents() {
    document.querySelectorAll('.style-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.style-toggle-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.setOutfitStyle(e.currentTarget.dataset.style);
      });
    });

    document.querySelectorAll('.part-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.part-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.state.colorTarget = e.currentTarget.dataset.target;
      });
    });

    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const hex = parseInt(e.currentTarget.dataset.color, 16);
        const name = e.currentTarget.dataset.name;
        this.setColor(hex, name);
      });
    });

    document.getElementById('select-weave')?.addEventListener('change', (e) => {
      this.setWeaveStyle(e.target.value);
    });

    document.getElementById('select-pattern')?.addEventListener('change', (e) => {
      this.setPatternStyle(e.target.value);
    });

    document.getElementById('slider-maedeup-scale')?.addEventListener('input', (e) => {
      const scale = parseFloat(e.target.value);
      document.getElementById('maedeup-scale-val').innerText = `${Math.round(scale * 100)}%`;
      this.setMaedeupScale(scale);
    });

    // 추천 위치 원클릭 부착 이벤트
    document.querySelectorAll('.preset-maedeup-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.maedeup;
        const spot = e.currentTarget.dataset.spot;
        this.attachPresetMaedeup(type, spot);
      });
    });

    document.getElementById('btn-rotate')?.addEventListener('click', () => this.toggleAutoRotate());
    document.getElementById('btn-zoom')?.addEventListener('click', () => this.resetZoom());
    document.getElementById('btn-lighting')?.addEventListener('click', () => this.cycleLighting());
    document.getElementById('btn-save-lookbook')?.addEventListener('click', () => this.captureLookbook());
  }

  onWindowResize() {
    if (this.isFallback) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    if (this.isFallback) return;
    requestAnimationFrame(() => this.animate());

    if (this.state.isAutoRotate && this.outfitGroup) {
      this.outfitGroup.rotation.y += 0.005;
    }

    this.updateDynamicSkirtPhysics();

    if (this.particles) {
      this.particles.rotation.y -= 0.002;
      const time = Date.now() * 0.002;
      this.particleMaterial.size = 0.065 + Math.sin(time) * 0.015;
    }

    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.SilkSimulator = SilkSimulator;
