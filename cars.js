/* NeonNav – Fahrzeugdatenbank (deutscher Markt, aktuelle + gängige ältere Modelle)
   Richtwerte nach Herstellerangabe (WLTP kombiniert, gerundet).
   b = Benzin / Hybrid (L/100 km) · d = Diesel (L/100 km) · e = Elektro (kWh/100 km)
   Format je Eintrag: "Modell Motor:Verbrauch", getrennt durch "|" */
window.NN_CARS = {
  'Abarth': {
    b: '595 1.4 T-Jet:6.8|695 1.4 T-Jet:7.0|124 Spider 1.4:6.9',
    e: '500e:16.0|600e:17.5'
  },
  'Aiways': {
    e: 'U5:16.6|U6:16.9'
  },
  'Alfa Romeo': {
    b: 'MiTo 1.4 TB:6.0|Giulietta 1.4 TB:6.6|Giulia 2.0 Turbo:7.3|Giulia Quadrifoglio:10.5|Stelvio 2.0 Turbo:8.4|Tonale 1.5 Hybrid:6.2|Junior Ibrida:5.0',
    d: 'Giulietta 1.6 JTDM:4.6|Giulia 2.2 Diesel:5.1|Stelvio 2.2 Diesel:6.1|Tonale 1.6 Diesel:5.3',
    e: 'Junior Elettrica:15.5'
  },
  'Alpine': {
    b: 'A110:6.9|A110 S:7.0',
    e: 'A290:15.8|A390:18.0'
  },
  'Aston Martin': {
    b: 'Vantage V8:12.0|DB12:12.2|DBX 707:14.3'
  },
  'Audi': {
    b: 'A1 25 TFSI:5.5|A1 30 TFSI:5.6|A1 35 TFSI:6.0|A3 30 TFSI:5.6|A3 35 TFSI:5.9|A3 40 TFSI:7.0|S3 TFSI:8.2|RS3:9.3|A4 35 TFSI:6.4|A4 40 TFSI:6.7|A4 45 TFSI quattro:7.4|S4 TFSI (bis 2019):8.0|A5 Sportback 35 TFSI:6.5|A5 Sportback 40 TFSI:6.8|A5 (2024) 2.0 TFSI:6.8|A6 40 TFSI:7.1|A6 45 TFSI:7.6|A6 55 TFSI:8.5|RS6 Avant:12.3|A7 55 TFSI:8.6|A8 55 TFSI:9.5|Q2 30 TFSI:5.9|Q2 35 TFSI:6.3|Q3 35 TFSI:7.2|Q3 Sportback 35 TFSI:7.1|Q3 40 TFSI quattro:8.6|Q5 40 TFSI:8.0|Q5 45 TFSI:8.3|SQ5 TFSI:10.0|Q7 55 TFSI:10.4|Q8 55 TFSI:10.6|RS Q8:12.8|TT 40 TFSI:6.9|TT RS:9.3|R8 V10:13.4',
    d: 'A1 1.6 TDI (bis 2018):4.0|A3 30 TDI:4.4|A3 35 TDI:4.6|A3 2.0 TDI (8V):4.4|A4 30 TDI:4.7|A4 35 TDI:4.9|A4 40 TDI quattro:5.5|A4 2.0 TDI (B8):4.8|A5 Sportback 35 TDI:5.0|A5 Sportback 40 TDI:5.2|A5 (2024) 2.0 TDI:5.2|A6 40 TDI:5.6|A6 45 TDI quattro:6.6|A6 50 TDI quattro:6.9|A6 3.0 TDI (C7):5.8|A7 50 TDI:6.9|A8 50 TDI:7.4|Q3 35 TDI:5.6|Q3 40 TDI quattro:6.7|Q5 35 TDI:5.9|Q5 40 TDI quattro:6.6|Q5 2.0 TDI (8R):6.2|SQ5 TDI:7.6|Q7 45 TDI:8.0|Q7 50 TDI:8.3|Q8 50 TDI:8.4|SQ7 TDI (bis 2020):8.3',
    e: 'Q4 40 e-tron:17.0|Q4 45 e-tron quattro:18.2|Q4 Sportback 45 e-tron:17.5|Q6 e-tron:17.5|Q6 e-tron quattro:18.5|SQ6 e-tron:19.4|A6 Sportback e-tron:15.0|A6 Avant e-tron:15.8|Q8 e-tron 50:22.5|Q8 e-tron 55:23.5|e-tron GT quattro:20.0|RS e-tron GT:21.5'
  },
  'Bentley': {
    b: 'Continental GT V8:12.7|Bentayga V8:13.3|Flying Spur V8:12.4'
  },
  'BMW': {
    b: '116i:6.0|118i:6.2|120i (2024):6.2|128ti:6.9|M135i:8.1|218i Gran Coupé:6.1|218i Active Tourer:6.3|220i Coupé:6.7|M240i:8.7|318i:6.3|320i:6.4|330i:6.7|M340i xDrive:8.4|M3 Competition:10.2|420i Coupé:6.5|420i Gran Coupé:6.6|430i:6.9|M440i xDrive:8.4|M4 Competition:10.1|520i (G60):6.4|520i (G30):6.4|530i:6.8|540i xDrive:7.9|M5 (F90):11.2|730i:7.4|740i:8.1|X1 sDrive18i:6.4|X1 sDrive20i:6.6|X2 sDrive20i:6.7|X3 20 xDrive:7.6|X3 30i xDrive:7.9|X3 M40i:9.0|X4 xDrive20i:7.8|X4 M40i:9.3|X5 xDrive40i:9.4|X6 xDrive40i:9.5|X7 xDrive40i:10.4|Z4 sDrive20i:6.7|Z4 M40i:8.1|i3 REx (Benziner-Modus):6.0',
    d: '116d:4.4|118d:4.6|120d:4.8|116d (F20):4.2|118d (F20):4.4|216d Gran Tourer:4.9|218d Active Tourer:4.9|220d Coupé:5.1|318d:4.8|320d:4.9|320d xDrive:5.3|330d:5.6|M340d xDrive:6.0|320d (F30):4.6|420d Coupé:5.0|420d Gran Coupé:5.0|430d xDrive:5.9|520d (G60):5.2|520d (G30):5.0|520d (F10):4.9|530d xDrive:6.0|540d xDrive:6.4|730d:6.4|740d xDrive:6.8|X1 sDrive18d:5.0|X1 xDrive23d:5.6|X1 sDrive18d (F48):4.9|X2 sDrive18d:5.1|X3 20d xDrive:6.2|X3 30d xDrive:6.8|X3 xDrive20d (F25):5.6|X4 xDrive20d:6.1|X4 xDrive30d:6.8|X5 xDrive30d:7.4|X5 xDrive40d:7.6|X6 xDrive30d:7.6|X7 xDrive40d:8.1',
    e: 'i3 (120 Ah):15.3|i4 eDrive35:16.5|i4 eDrive40:16.1|i4 M50:19.8|i5 eDrive40:16.5|i5 M60 xDrive:19.0|i7 eDrive50:18.9|i7 xDrive60:20.1|iX1 eDrive20:15.6|iX1 xDrive30:16.8|iX2 eDrive20:15.0|iX3:18.9|iX3 (Neue Klasse):15.1|iX xDrive40:19.4|iX xDrive50:20.2|iX M60:22.8'
  },
  'BYD': {
    b: 'Seal U DM-i (Hybrid-Modus):5.3|Sealion 7 DM-i:5.5',
    e: 'Dolphin Surf:15.1|Dolphin:15.9|Atto 2:15.6|Atto 3:16.5|Seal:16.9|Seal AWD:17.9|Seal U:20.0|Seal 6:15.2|Sealion 7:18.0|Han:17.0|Tang:24.0'
  },
  'Cadillac': {
    e: 'Lyriq:21.5|Optiq:20.0'
  },
  'Citroën': {
    b: 'C1 1.0 VTi:4.9|C3 PureTech 83:5.7|C3 PureTech 110:5.8|C3 (2024) Hybrid 100:5.3|C3 Aircross PureTech 110:6.1|C4 PureTech 130:6.2|C4 Hybrid 136:5.3|C4 X PureTech 130:6.1|C5 X PureTech 130:6.6|C5 Aircross PureTech 130:6.8|C5 Aircross Hybrid 145:5.5|Berlingo PureTech 110:6.9|SpaceTourer:8.0',
    d: 'C3 BlueHDi 100:4.4|C3 Aircross BlueHDi 110:5.0|C4 BlueHDi 130:5.0|C4 Picasso BlueHDi 120:4.6|C5 Aircross BlueHDi 130:5.4|C5 X BlueHDi 130:5.3|Berlingo BlueHDi 100:5.6|Berlingo BlueHDi 130:5.9|Jumpy BlueHDi 145:7.2|Jumper BlueHDi 140:8.9|SpaceTourer BlueHDi 150:7.3',
    e: 'Ami:5.8|ë-C3:17.0|ë-C3 Aircross:17.5|ë-C4:15.6|ë-C4 X:15.4|ë-C5 Aircross:16.6|ë-Berlingo:19.5|ë-SpaceTourer:25.0'
  },
  'Cupra': {
    b: '|Leon 1.5 eTSI 150:5.8|Leon 2.0 TSI 300:7.5|Formentor 1.5 TSI 150:6.4|Formentor 2.0 TSI 4Drive 310:8.6|Ateca 2.0 TSI 300:8.9|Terramar 1.5 eTSI 150:6.5|Terramar 2.0 TSI 265:8.4',
    d: 'Leon 2.0 TDI 150:4.7|Formentor 2.0 TDI 150:5.0',
    e: 'Born 58 kWh:16.0|Born 77 kWh:16.7|Born VZ:16.2|Tavascan:17.0|Tavascan VZ:18.0|Raval:14.5'
  },
  'Dacia': {
    b: 'Sandero SCe 65:5.7|Sandero TCe 90:5.4|Sandero TCe 100 ECO-G (Benzin):5.6|Sandero Stepway TCe 110:5.6|Logan TCe 90:5.4|Jogger TCe 110:5.9|Jogger Hybrid 140:4.8|Duster TCe 130:5.9|Duster Hybrid 140:5.0|Duster TCe 150 4x4 (bis 2023):7.2|Bigster TCe 140 Mild-Hybrid:5.9|Bigster Hybrid 155:4.8',
    d: 'Sandero dCi 90 (bis 2020):4.0|Duster Blue dCi 115:5.0|Duster Blue dCi 115 4x4:5.5|Logan MCV dCi 90:4.1|Dokker dCi 95:4.8|Lodgy dCi 110:4.6',
    e: 'Spring Electric 45:13.9|Spring Electric 65:14.6'
  },
  'Dodge': {
    b: 'Challenger 5.7 V8:13.5|RAM 1500 5.7 V8:13.2'
  },
  'DS': {
    b: 'DS 3 PureTech 130:6.1|DS 4 PureTech 130:6.2|DS 7 PureTech 130:6.6',
    d: 'DS 3 BlueHDi 130:5.0|DS 4 BlueHDi 130:5.0|DS 7 BlueHDi 130:5.2',
    e: 'DS 3 E-Tense:16.0|N°8:16.2'
  },
  'Ferrari': {
    b: 'Roma:11.2|296 GTB (Hybrid-Modus):11.5|812 Superfast:15.3|Purosangue:17.3'
  },
  'Fiat': {
    b: '500 1.2:5.2|500 1.0 Hybrid:5.3|500X 1.0 FireFly:6.5|500X 1.5 Hybrid:5.9|Panda 1.2:5.7|Panda 1.0 Hybrid:5.4|Pandina 1.0 Hybrid:5.4|Grande Panda Hybrid:5.4|Tipo 1.4:6.6|Tipo 1.0 FireFly:6.1|Tipo 1.5 Hybrid:5.4|600 Hybrid:5.0|Punto 1.2 (bis 2018):5.9|Doblò 1.4:7.8',
    d: 'Tipo 1.6 MultiJet:4.6|500X 1.6 MultiJet:5.0|Doblò 1.6 MultiJet:5.6|Ducato 2.2 MultiJet 140:8.9|Ducato Wohnmobil 2.3 MultiJet:11.0|Talento 2.0 MultiJet:7.5',
    e: '500e 24 kWh:13.0|500e 42 kWh:14.9|600e:15.1|Grande Panda Elettrica:16.8|E-Doblò:19.5|E-Ducato:28.0'
  },
  'Ford': {
    b: 'Fiesta 1.1:5.4|Fiesta 1.0 EcoBoost 100:5.5|Fiesta ST 1.5 EcoBoost:6.6|Ka+ 1.2:5.6|Puma 1.0 EcoBoost 125 Hybrid:5.6|Puma ST 1.5:6.8|Focus 1.0 EcoBoost 125:5.8|Focus 1.0 EcoBoost Hybrid:5.4|Focus 1.5 EcoBoost 150:6.4|Focus ST 2.3:8.5|C-Max 1.0 EcoBoost:6.0|Kuga 1.5 EcoBoost 150:7.3|Kuga 2.5 FHEV Hybrid:5.4|Mondeo 1.5 EcoBoost:6.9|Mondeo 2.0 Hybrid:5.6|S-Max 2.5 Hybrid:6.4|Galaxy 2.5 Hybrid:6.5|Mustang 5.0 V8:12.4|Ranger 2.3 EcoBoost Raptor:13.8|Bronco 2.7 V6:12.5|Tourneo Courier 1.0 EcoBoost:6.0|Tourneo Connect 1.5 EcoBoost:7.1',
    d: 'Fiesta 1.5 TDCi:4.2|Focus 1.5 EcoBlue 120:4.6|Focus 2.0 EcoBlue 150:5.0|C-Max 1.5 TDCi:4.6|Kuga 1.5 EcoBlue 120:5.4|Kuga 2.0 EcoBlue 150 AWD:6.1|Mondeo 2.0 EcoBlue 150:5.0|S-Max 2.0 EcoBlue 190:6.0|Galaxy 2.0 EcoBlue:6.1|Ranger 2.0 EcoBlue:8.4|Ranger 3.0 V6 Diesel:9.6|Transit Connect 1.5 EcoBlue:5.4|Transit Custom 2.0 EcoBlue 136:7.0|Tourneo Custom 2.0 EcoBlue 150:7.2|Transit 2.0 EcoBlue 130:8.8',
    e: 'Puma Gen-E:14.6|Explorer Extended Range RWD:14.6|Explorer AWD:16.5|Capri Extended Range:15.6|Mustang Mach-E Standard Range:17.2|Mustang Mach-E Extended Range:16.6|Mustang Mach-E GT:20.0|E-Tourneo Courier:17.5|E-Transit Custom:22.0|E-Transit:31.0'
  },
  'Genesis': {
    b: 'G70 2.0T:9.0|GV70 2.5T:10.3|GV80 2.5T:11.0',
    e: 'GV60:18.5|Electrified GV70:20.2|Electrified G80:19.1'
  },
  'Honda': {
    b: 'Jazz 1.3:5.5|Jazz e:HEV:4.5|Civic 1.0 VTEC Turbo:5.9|Civic 1.5 VTEC Turbo:6.5|Civic e:HEV:4.7|Civic Type R:9.7|HR-V 1.5 i-VTEC:6.3|HR-V e:HEV:5.4|ZR-V e:HEV:5.6|CR-V 1.5 VTEC Turbo:7.6|CR-V e:HEV:6.1|ZR-V 2.0 e:HEV:5.6',
    d: 'Civic 1.6 i-DTEC:4.2|CR-V 1.6 i-DTEC:5.4',
    e: 'Honda e:17.8|e:Ny1:18.2'
  },
  'Hyundai': {
    b: 'i10 1.0:5.0|i10 1.2:5.6|i20 1.0 T-GDI:5.3|i20 1.2:5.6|i20 N:7.0|Bayon 1.0 T-GDI:5.5|i30 1.0 T-GDI:5.5|i30 1.5 T-GDI 48V:6.0|i30 N 2.0 T-GDI:8.3|Elantra 1.6:6.4|Kona 1.0 T-GDI:6.0|Kona Hybrid 1.6:4.6|Ioniq Hybrid:4.0|Tucson 1.6 T-GDI 150:7.3|Tucson 1.6 T-GDI Hybrid:5.6|Santa Fe 1.6 T-GDI Hybrid:6.6|ix20 1.4:6.3|ix35 2.0 GDI:7.9',
    d: 'i20 1.4 CRDi:4.3|i30 1.6 CRDi 115:4.4|i30 1.6 CRDi 136 48V:4.7|ix35 1.7 CRDi:5.4|Tucson 1.6 CRDi 136 48V:5.6|Tucson 2.0 CRDi 4WD:6.5|Santa Fe 2.2 CRDi:7.0|Staria 2.2 CRDi:9.4|H-1 2.5 CRDi:9.0',
    e: 'Inster:14.3|Kona Elektro 48 kWh:14.7|Kona Elektro 65 kWh:14.9|Kona Elektro 64 kWh (bis 2022):15.4|Ioniq Elektro:13.8|Ioniq 5 58 kWh:16.7|Ioniq 5 77/84 kWh:17.0|Ioniq 5 AWD:19.0|Ioniq 5 N:21.2|Ioniq 6 RWD:14.3|Ioniq 6 AWD:16.0|Ioniq 9:20.6'
  },
  'Ineos': {
    b: 'Grenadier 3.0 Benzin:14.4',
    d: 'Grenadier 3.0 Diesel:11.9'
  },
  'Jaguar': {
    b: 'E-Pace P200:8.8|F-Pace P250:9.6|F-Type P300:9.0|F-Type P450 V8:11.0|XE P250:7.9|XF P250:8.1',
    d: 'E-Pace D165:6.2|F-Pace D200:6.9|F-Pace D300:7.7|XE D200:5.6|XF D200:5.7',
    e: 'I-Pace EV400:22.0'
  },
  'Jeep': {
    b: 'Avenger 1.2:5.8|Avenger e-Hybrid:5.0|Renegade 1.0 T-GDI:6.6|Renegade 1.5 e-Hybrid:6.0|Compass 1.3 T-GDI:7.4|Compass 1.5 e-Hybrid:6.1|Wrangler 2.0 Turbo:11.0|Grand Cherokee 3.6 V6:12.4',
    d: 'Renegade 1.6 MultiJet:5.2|Compass 1.6 MultiJet:5.4|Cherokee 2.2 MultiJet:7.0|Grand Cherokee 3.0 V6 CRD:8.8',
    e: 'Avenger Elektro:15.4|Compass (2025) Elektro:17.5'
  },
  'KGM / SsangYong': {
    b: 'Tivoli 1.5 T-GDI:7.6|Korando 1.5 T-GDI:8.3|Torres 1.5 T-GDI:9.0',
    d: 'Tivoli 1.6 e-XDi:5.8|Korando 1.6 e-XDi:6.3|Rexton 2.2 e-XDi:9.8|Musso 2.2 e-XDi:9.8',
    e: 'Korando e-Motion:19.3|Torres EVX:19.5'
  },
  'Kia': {
    b: 'Picanto 1.0:4.9|Picanto 1.2:5.4|Rio 1.0 T-GDI:5.3|Rio 1.2:5.5|Stonic 1.0 T-GDI 48V:5.4|Ceed 1.0 T-GDI:5.6|Ceed 1.5 T-GDI:6.1|Ceed GT 1.6 T-GDI:7.7|XCeed 1.5 T-GDI:6.3|ProCeed 1.5 T-GDI:6.1|Niro Hybrid 1.6:4.4|Sportage 1.6 T-GDI 150:7.3|Sportage 1.6 T-GDI Hybrid:5.6|Sorento 1.6 T-GDI Hybrid:6.4|Soul 1.6 GDI:7.0|Venga 1.4:6.2|Carens 1.6 GDI:7.2',
    d: 'Rio 1.4 CRDi:4.2|Ceed 1.6 CRDi 136 48V:4.5|XCeed 1.6 CRDi:4.7|Sportage 1.6 CRDi 136 48V:5.5|Sportage 2.0 CRDi (QL):6.0|Sorento 2.2 CRDi:6.9|Carens 1.7 CRDi:5.2',
    e: 'EV2:15.0|EV3 58 kWh:14.9|EV3 81 kWh:15.1|EV4:14.5|EV5:17.5|EV6 RWD:16.5|EV6 AWD:18.0|EV6 GT:20.6|EV9:21.0|Niro EV:16.2|e-Niro 64 kWh:15.9|e-Soul 64 kWh:15.7|PV5:20.0'
  },
  'Lamborghini': {
    b: 'Urus S:14.1|Huracán EVO:13.9|Revuelto (Hybrid):11.9'
  },
  'Lancia': {
    b: 'Ypsilon 1.2 (bis 2024):5.8|Ypsilon Hybrid (2024):5.2',
    e: 'Ypsilon Elettrica:15.6'
  },
  'Land Rover': {
    b: 'Range Rover Evoque P200 MHEV:8.6|Discovery Sport P250:9.0|Range Rover Velar P250:9.3|Range Rover Sport P400 MHEV:10.6|Range Rover P530 V8:12.9|Defender 110 P300:11.6|Defender 110 P400 MHEV:11.9',
    d: 'Range Rover Evoque D165 MHEV:6.2|Range Rover Evoque D200 MHEV:6.4|Discovery Sport D165:6.5|Discovery Sport D200:6.6|Range Rover Velar D200:6.6|Range Rover Velar D300:7.5|Range Rover Sport D300 MHEV:7.5|Range Rover D350 MHEV:7.9|Discovery D300 MHEV:8.4|Defender 90 D250:8.6|Defender 110 D250:8.9|Defender 110 D300:9.0|Discovery 4 3.0 SDV6:9.3'
  },
  'Leapmotor': {
    e: 'T03:16.3|B10:16.2|C10:19.1'
  },
  'Lexus': {
    b: 'LBX Hybrid:4.4|UX 250h:5.2|UX 300h:5.3|NX 350h:5.9|RX 350h:6.4|RX 500h:8.4|ES 300h:5.3|IS 300h:5.8|LC 500:12.0|LM 350h:7.3|CT 200h:4.4',
    e: 'UX 300e:16.6|RZ 450e:18.7|RZ 500e (2025):18.0'
  },
  'Lotus': {
    b: 'Emira V6:11.0|Emira i4:9.0',
    e: 'Eletre:22.0|Emeya:20.0'
  },
  'Lynk & Co': {
    b: '01 Hybrid (HEV):6.6',
    e: '02:16.5'
  },
  'Maserati': {
    b: 'Ghibli 2.0 Hybrid:9.6|Levante 2.0 Hybrid:10.4|Grecale GT 2.0:9.3|Grecale Trofeo 3.0 V6:11.4|MC20:11.6|GranTurismo Modena:10.7',
    d: 'Ghibli 3.0 V6 Diesel:6.5|Levante 3.0 V6 Diesel:7.6',
    e: 'Grecale Folgore:20.5|GranTurismo Folgore:22.0'
  },
  'Mazda': {
    b: 'Mazda2 1.5 Skyactiv-G:5.3|Mazda2 Hybrid:4.0|Mazda3 2.0 e-Skyactiv-G:5.7|Mazda3 2.5 e-Skyactiv-G 140:6.6|Mazda3 e-Skyactiv-X:5.9|CX-3 2.0:6.4|CX-30 2.0 e-Skyactiv-G:6.1|CX-30 2.5 e-Skyactiv-G 140:6.6|CX-5 2.0 e-Skyactiv-G:7.0|CX-5 2.5 Skyactiv-G 194 AWD:8.2|Mazda6 2.0 Skyactiv-G:6.5|Mazda6 2.5 Skyactiv-G:7.0|MX-5 1.5:6.3|MX-5 2.0:6.8|CX-60 2.5 PHEV (Hybrid-Modus):6.8',
    d: 'Mazda3 1.8 Skyactiv-D:4.7|CX-3 1.8 Skyactiv-D:4.9|CX-5 2.2 Skyactiv-D 150:5.9|CX-5 2.2 Skyactiv-D 184 AWD:6.6|Mazda6 2.2 Skyactiv-D:5.3|CX-60 3.3 e-Skyactiv D 200:4.9|CX-60 3.3 e-Skyactiv D 254 AWD:5.3|CX-80 3.3 e-Skyactiv D 254:5.7',
    e: 'MX-30:19.0|6e:16.6|CX-6e:17.5'
  },
  'McLaren': {
    b: 'Artura (Hybrid-Modus):11.0|750S:12.2|GTS:12.2'
  },
  'Mercedes-Benz': {
    b: 'A 160:6.0|A 180:6.0|A 200:6.2|A 250:6.8|AMG A 35:8.4|AMG A 45 S:9.0|B 180:6.4|B 200:6.6|CLA 180:6.0|CLA 200:6.2|CLA 250:6.7|AMG CLA 35:8.3|CLA (2025) 220 Hybrid:4.9|C 180:6.4|C 200:6.6|C 300:7.2|AMG C 43:9.3|C 180 (W205):6.0|C 200 (W205):6.4|E 200:7.0|E 300 (W213):7.5|E 450 4MATIC:8.4|AMG E 53:9.4|AMG E 63 S:11.6|S 450 4MATIC:8.4|S 500 4MATIC:8.6|AMG S 63 (Hybrid-Modus):12.0|CLS 450:8.4|GLA 180:6.6|GLA 200:6.7|GLA 250 4MATIC:7.7|AMG GLA 35:9.1|GLB 180:7.0|GLB 200:7.1|GLB 250 4MATIC:7.9|GLC 200:7.6|GLC 300 4MATIC:8.4|AMG GLC 43:10.0|GLE 450 4MATIC:9.6|AMG GLE 53:10.7|GLS 450 4MATIC:10.4|G 500:13.4|AMG G 63:15.9|SL 43:9.3|AMG SL 55:12.7|AMG GT 63:13.2|Citan 113:6.8|T 180:6.9',
    d: 'A 180 d:4.4|A 200 d:4.6|A 220 d:4.8|B 180 d:4.6|B 200 d:4.8|CLA 180 d:4.4|CLA 200 d:4.6|C 200 d:4.8|C 220 d:5.0|C 300 d:5.3|C 220 d 4MATIC:5.6|C 220 d (W205):4.9|C 250 d (W205):5.0|E 200 d:5.2|E 220 d:5.3|E 220 d (W213):4.9|E 300 d:5.7|E 400 d 4MATIC:6.4|E 220 CDI (W212):5.2|S 350 d 4MATIC:6.6|S 450 d 4MATIC:6.9|GLA 180 d:5.0|GLA 200 d:5.1|GLB 200 d:5.4|GLB 220 d 4MATIC:5.9|GLC 200 d 4MATIC:6.0|GLC 220 d 4MATIC:6.1|GLC 300 d 4MATIC:6.4|GLC 220 d (X253):6.2|GLE 300 d 4MATIC:7.0|GLE 350 d 4MATIC:7.3|GLE 400 d 4MATIC:7.6|GLS 350 d 4MATIC:8.0|GLS 450 d 4MATIC:8.2|G 450 d:9.9|ML 350 BlueTEC:7.5|Citan 112 CDI:5.6|T 180 d:5.4|Vito 114 CDI:7.2|Vito 116 CDI:7.4|Vito 119 CDI 4MATIC:8.2|V 220 d:7.1|V 250 d:7.2|V 300 d:7.4|Sprinter 314 CDI:9.0|Sprinter 317 CDI:9.3|Sprinter 319 CDI:9.6|Marco Polo 250 d:8.0',
    e: 'EQA 250:16.8|EQA 250+:15.5|EQA 300 4MATIC:17.5|EQB 250+:16.4|EQB 300 4MATIC:18.3|CLA 250+ (2025):12.2|CLA 350 4MATIC (2025):13.0|EQC 400 4MATIC:22.5|EQE 300:16.0|EQE 350+:16.0|EQE 500 4MATIC:18.5|EQE SUV 350+:18.6|EQE SUV 500 4MATIC:20.5|EQS 450+:16.6|EQS 580 4MATIC:19.0|EQS SUV 450+:20.5|EQS SUV 580 4MATIC:22.5|G 580 EQ:30.0|GLC 400 4MATIC EQ:16.5|EQV 300:27.0|eVito Tourer:25.0|eSprinter:31.0|eCitan:19.0|EQT 200:19.0'
  },
  'MG': {
    b: 'MG3 Hybrid+:4.4|ZS 1.5:6.9|ZS Hybrid+:5.0|ZS 1.0T:6.3|HS 1.5T:7.4|HS Hybrid+:5.5|HS PHEV (Hybrid-Modus):6.5',
    e: 'MG4 51 kWh:16.0|MG4 64 kWh:16.6|MG4 77 kWh:16.9|MG4 XPOWER:18.7|MG5 Electric:17.0|ZS EV:18.0|Marvel R:20.0|Cyberster:19.0|S5 EV:17.0|IM5:16.5|IM6:17.6'
  },
  'Mini': {
    b: 'One 1.5 (F56):5.6|Cooper 1.5 (F56):5.8|Cooper S 2.0 (F56):6.5|John Cooper Works (F56):7.0|Cooper C (2024):6.0|Cooper S (2024):6.5|Clubman Cooper:6.3|Clubman Cooper S:6.8|Countryman Cooper (F60):6.5|Countryman C (2024):6.6|Countryman S ALL4 (2024):7.4|Cabrio Cooper:6.0|Paceman Cooper S:6.8',
    d: 'One D:4.3|Cooper D (F56):4.4|Cooper SD:4.6|Clubman Cooper D:4.6|Countryman Cooper D (F60):5.0|Countryman D (2024):5.0',
    e: 'Cooper SE (F56):15.8|Cooper E (J01):14.0|Cooper SE (J01):14.6|Aceman E:14.1|Aceman SE:14.7|Countryman E:16.0|Countryman SE ALL4:17.2'
  },
  'Mitsubishi': {
    b: 'Space Star 1.2:5.0|ASX 1.0 Turbo:5.9|ASX 1.6 HEV:4.7|Colt 1.0:5.4|Colt 1.6 HEV:4.3|Eclipse Cross 1.5 Turbo:7.7|Outlander PHEV (Hybrid-Modus):7.0',
    d: 'ASX 1.6 DI-D:5.2|Outlander 2.2 DI-D:6.5|L200 2.2 DI-D:9.0|L200 2.4 DI-D:8.5|Pajero 3.2 DI-D:9.1'
  },
  'NIO': {
    e: 'ET5:16.4|ET5 Touring:16.8|ET7:17.6|EL6:19.0|EL7:21.0|EL8:22.0'
  },
  'Nissan': {
    b: 'Micra 1.0 IG-T:5.6|Micra 1.0:5.3|Juke 1.0 DIG-T:6.0|Juke Hybrid:5.1|Qashqai 1.3 DIG-T MHEV 140:6.3|Qashqai 1.3 DIG-T 158 Xtronic:6.6|Qashqai e-Power:5.3|X-Trail 1.5 VC-T MHEV:7.3|X-Trail e-Power e-4ORCE:6.4|Note 1.2:5.2|Pulsar 1.2 DIG-T:5.6|GT-R:12.4',
    d: 'Qashqai 1.5 dCi:4.6|Qashqai 1.6 dCi:5.0|X-Trail 1.6 dCi:5.4|X-Trail 2.0 dCi:6.2|Juke 1.5 dCi:4.6|Navara 2.3 dCi:8.5|NV200 1.5 dCi:5.5|Primastar 2.0 dCi:7.6|Interstar 2.3 dCi:9.0',
    e: 'Micra (2025):15.0|Leaf 40 kWh:17.1|Leaf 62 kWh:18.5|Leaf (2025):14.5|Ariya 63 kWh:17.3|Ariya 87 kWh:18.7|Ariya e-4ORCE:20.0|Townstar EV:20.0'
  },
  'Opel': {
    b: 'Adam 1.2:5.7|Karl 1.0:5.0|Corsa 1.2 75 PS:5.4|Corsa 1.2 Turbo 100:5.6|Corsa 1.2 Hybrid:4.9|Corsa E 1.4 (bis 2019):6.0|Astra 1.2 Turbo 110:5.8|Astra 1.2 Turbo 130:5.9|Astra 1.2 Hybrid:5.0|Astra K 1.4 Turbo:6.3|Astra J 1.4 Turbo:6.5|Crossland 1.2 Turbo 110:6.1|Grandland 1.2 Turbo 130:6.8|Grandland (2024) Hybrid:5.5|Mokka 1.2 Turbo 100:5.9|Mokka 1.2 Turbo 130:6.0|Mokka X 1.4 Turbo:7.0|Frontera 1.2 Hybrid:5.4|Insignia 1.5 Turbo:6.8|Insignia 2.0 Turbo 4x4:8.7|Meriva 1.4 Turbo:6.6|Zafira 1.4 Turbo:7.0|Combo Life 1.2 Turbo:6.8',
    d: 'Corsa 1.5 Diesel:4.3|Corsa E 1.3 CDTI:4.2|Astra 1.5 Diesel 130:4.8|Astra K 1.6 CDTI:4.6|Astra J 1.7 CDTI:4.9|Crossland 1.5 Diesel:4.9|Grandland 1.5 Diesel 130:5.4|Mokka 1.5 Diesel:4.8|Insignia 1.6 CDTI:5.0|Insignia 2.0 Diesel 174:5.4|Insignia A 2.0 CDTI:5.6|Zafira Life 2.0 Diesel 145:7.3|Zafira C 1.6 CDTI:5.0|Combo Life 1.5 Diesel 130:5.7|Vivaro 2.0 Diesel 145:7.2|Movano 2.2 Diesel:9.0',
    e: 'Corsa Electric 50 kWh:16.7|Corsa Electric 51 kWh:15.2|Astra Electric:14.8|Astra Sports Tourer Electric:15.1|Mokka Electric:15.2|Frontera Electric:18.0|Grandland Electric:17.3|Ampera-e:16.8|Combo Electric:19.5|Zafira Electric:25.0|Vivaro Electric:25.0'
  },
  'Peugeot': {
    b: '108 1.0 VTi:4.8|208 PureTech 75:5.4|208 PureTech 100:5.6|208 Hybrid 100:4.8|208 (bis 2019) 1.2 PureTech:5.3|2008 PureTech 100:5.9|2008 PureTech 130:6.0|2008 Hybrid 136:5.2|308 PureTech 130:5.9|308 Hybrid 136:5.2|308 SW PureTech 130:6.0|308 (T9) 1.2 PureTech:5.6|408 PureTech 130:6.2|408 Hybrid 136:5.5|3008 PureTech 130:6.6|3008 Hybrid 136:5.5|3008 (P84) 1.2 PureTech:6.3|5008 PureTech 130:6.8|5008 Hybrid 136:5.8|508 PureTech 180:6.9|Rifter PureTech 110:6.9',
    d: '208 BlueHDi 100:4.1|208 (bis 2019) 1.6 BlueHDi:3.9|2008 BlueHDi 110:4.7|2008 BlueHDi 130:4.8|308 BlueHDi 130:4.8|308 (T9) 1.5 BlueHDi:4.4|408 BlueHDi 130:5.0|3008 BlueHDi 130:5.2|3008 (P84) 2.0 BlueHDi:5.5|5008 BlueHDi 130:5.4|508 BlueHDi 130:4.9|508 BlueHDi 160:5.2|Rifter BlueHDi 100:5.6|Rifter BlueHDi 130:5.9|Expert BlueHDi 145:7.2|Traveller BlueHDi 150:7.3|Boxer BlueHDi 140:8.9',
    e: 'e-208 50 kWh:15.6|e-208 51 kWh:14.6|e-2008:15.4|e-308:15.2|e-308 SW:15.4|e-408:15.8|e-3008:16.1|e-3008 Long Range:16.9|e-5008:17.6|e-Rifter:19.5|e-Traveller:25.0|e-Expert:25.0'
  },
  'Polestar': {
    e: 'Polestar 2 Standard Range:15.4|Polestar 2 Long Range:14.9|Polestar 2 Dual Motor:16.4|Polestar 3 Long Range Dual Motor:21.7|Polestar 4 Long Range Single Motor:17.6|Polestar 4 Dual Motor:19.1'
  },
  'Porsche': {
    b: '718 Cayman:9.0|718 Boxster:9.0|718 Cayman GTS 4.0:11.0|911 Carrera:10.4|911 Carrera S:10.6|911 Carrera 4S:10.8|911 Turbo S:12.3|911 GT3:13.0|Macan (bis 2024):10.1|Macan S (bis 2024):10.7|Cayenne:12.3|Cayenne S:12.5|Cayenne Coupé:12.4|Cayenne E-Hybrid (Hybrid-Modus):9.5|Panamera:10.1|Panamera 4:10.4',
    d: 'Cayenne Diesel (bis 2018):7.0|Macan S Diesel (bis 2018):6.5|Panamera 4S Diesel:7.0',
    e: 'Macan Electric:17.9|Macan 4 Electric:18.6|Macan Turbo Electric:20.0|Taycan:17.2|Taycan 4S:18.5|Taycan Turbo:19.6|Taycan Cross Turismo 4:20.0|Cayenne Electric:20.0'
  },
  'Renault': {
    b: 'Twingo SCe 65:5.1|Twingo TCe 90:5.2|Clio TCe 90:5.3|Clio TCe 100:5.4|Clio E-Tech Hybrid 145:4.3|Clio IV 0.9 TCe:5.1|Captur TCe 90:5.9|Captur TCe 140 Mild-Hybrid:6.3|Captur E-Tech Full Hybrid 145:4.8|Megane TCe 140:6.1|Megane IV 1.3 TCe:5.9|Megane E-Tech Plug-in (Hybrid-Modus):5.4|Arkana TCe 140:6.0|Arkana E-Tech Hybrid 145:4.9|Austral Mild-Hybrid 160:6.4|Austral E-Tech Full Hybrid 200:4.7|Espace E-Tech Full Hybrid 200:4.8|Symbioz E-Tech Hybrid:4.7|Rafale E-Tech 200:4.7|Kadjar TCe 140:6.4|Scenic TCe 140:6.4|Kangoo TCe 100:6.9|Talisman TCe 160:6.6',
    d: 'Clio Blue dCi 85:4.0|Clio IV 1.5 dCi:3.8|Captur Blue dCi 95:4.6|Megane Blue dCi 115:4.5|Megane IV 1.5 dCi:4.2|Kadjar Blue dCi 115:5.0|Scenic Blue dCi 120:5.2|Grand Scenic Blue dCi 150:5.6|Koleos Blue dCi 190:6.5|Talisman Blue dCi 160:5.2|Kangoo Blue dCi 95:5.4|Trafic Blue dCi 150:7.2|Master Blue dCi 150:9.0',
    e: 'Twingo Electric:16.0|Twingo E-Tech (2026):13.5|Renault 5 E-Tech 40 kWh:14.4|Renault 5 E-Tech 52 kWh:14.9|Renault 4 E-Tech:15.4|Zoe R110/R135:17.5|Megane E-Tech Electric:16.1|Scenic E-Tech Electric:17.0|Kangoo E-Tech:20.0|Trafic E-Tech:25.0|Master E-Tech:28.0'
  },
  'Rolls-Royce': {
    b: 'Ghost:15.7|Cullinan:16.5',
    e: 'Spectre:23.6'
  },
  'Seat': {
    b: 'Mii 1.0:4.9|Ibiza 1.0 MPI 80:5.4|Ibiza 1.0 TSI 95:5.3|Ibiza 1.0 TSI 115:5.4|Ibiza 1.5 TSI 150:5.9|Arona 1.0 TSI 95:5.6|Arona 1.0 TSI 115:5.6|Arona 1.5 TSI 150:6.0|Leon 1.0 eTSI 110:5.3|Leon 1.5 TSI 130:5.6|Leon 1.5 eTSI 150:5.7|Leon (5F) 1.4 TSI:5.4|Leon ST 1.5 TSI:5.8|Ateca 1.0 TSI 115:6.3|Ateca 1.5 TSI 150:6.6|Tarraco 1.5 TSI 150:7.3|Tarraco 2.0 TSI 245 4Drive:8.7|Alhambra 1.4 TSI:7.0|Toledo 1.0 TSI:5.1',
    d: 'Ibiza 1.6 TDI:4.1|Leon 2.0 TDI 115:4.4|Leon 2.0 TDI 150:4.6|Leon (5F) 1.6 TDI:4.1|Leon (5F) 2.0 TDI:4.4|Ateca 2.0 TDI 115:5.2|Ateca 2.0 TDI 150 4Drive:6.0|Tarraco 2.0 TDI 150:5.8|Tarraco 2.0 TDI 200 4Drive:6.7|Alhambra 2.0 TDI 150:5.6',
    e: 'Mii electric:14.9'
  },
  'Skoda': {
    b: 'Citigo 1.0:4.8|Fabia 1.0 MPI 80:5.3|Fabia 1.0 TSI 95:5.2|Fabia 1.0 TSI 116:5.3|Fabia 1.5 TSI 150:5.6|Fabia III 1.2 TSI:5.0|Scala 1.0 TSI 95:5.3|Scala 1.0 TSI 116:5.4|Scala 1.5 TSI 150:5.9|Kamiq 1.0 TSI 116:5.6|Kamiq 1.5 TSI 150:5.9|Octavia 1.0 eTSI 110:5.3|Octavia 1.5 TSI 150:5.7|Octavia 1.5 eTSI 150:5.6|Octavia 2.0 TSI 204 4x4:7.2|Octavia RS 2.0 TSI 265:6.9|Octavia III 1.4 TSI:5.5|Octavia III 1.0 TSI:5.0|Rapid 1.0 TSI:5.0|Karoq 1.0 TSI 116:6.1|Karoq 1.5 TSI 150:6.4|Karoq 2.0 TSI 190 4x4:7.9|Kodiaq 1.5 TSI 150:7.1|Kodiaq 2.0 TSI 204 4x4:8.4|Kodiaq RS 2.0 TSI:8.9|Superb 1.5 TSI 150:6.4|Superb 2.0 TSI 204 4x4:7.7|Superb 2.0 TSI 265 4x4:8.2|Yeti 1.2 TSI:6.4|Roomster 1.2 TSI:6.0',
    d: 'Fabia III 1.4 TDI:3.9|Scala 1.6 TDI:4.3|Octavia 2.0 TDI 116:4.3|Octavia 2.0 TDI 150:4.6|Octavia 2.0 TDI 193 4x4:5.4|Octavia RS 2.0 TDI:5.0|Octavia III 1.6 TDI:4.1|Octavia III 2.0 TDI:4.4|Rapid 1.6 TDI:4.1|Karoq 2.0 TDI 116:5.1|Karoq 2.0 TDI 150 4x4:5.7|Kodiaq 2.0 TDI 150:5.6|Kodiaq 2.0 TDI 193 4x4:6.4|Superb 2.0 TDI 150:5.0|Superb 2.0 TDI 193 4x4:5.8|Superb II 2.0 TDI:5.3|Yeti 2.0 TDI:5.2',
    e: 'Elroq 50:15.6|Elroq 60:15.9|Elroq 85:15.6|Enyaq 60:16.4|Enyaq 85:16.1|Enyaq 85x:17.1|Enyaq Coupé 85:15.6|Enyaq RS:17.4|Enyaq iV 80 (bis 2023):16.9|Citigo e iV:14.5|Epiq:14.5'
  },
  'Smart': {
    b: 'fortwo 1.0 (bis 2019):4.5|forfour 1.0 (bis 2019):4.7',
    e: 'EQ fortwo:16.5|EQ forfour:17.0|#1:16.8|#1 Brabus:17.8|#3:16.3|#5:19.9'
  },
  'Subaru': {
    b: 'Impreza e-Boxer:7.2|XV 1.6i:7.0|Crosstrek e-Boxer:7.7|Forester e-Boxer:8.1|Forester 2.0i (bis 2019):8.0|Outback 2.5i:8.7|Levorg 1.6 DIT:7.4|BRZ 2.4:9.5',
    d: 'Outback 2.0D:6.0|Forester 2.0D:6.2',
    e: 'Solterra:18.3|Uncharted:16.5'
  },
  'Suzuki': {
    b: 'Ignis 1.2 Hybrid:4.9|Swift 1.2 Hybrid:4.4|Swift 1.2 Dualjet (bis 2020):4.9|Swift Sport 1.4 Boosterjet:5.6|Baleno 1.2:5.1|Vitara 1.4 Boosterjet Hybrid:5.7|Vitara 1.5 Full Hybrid:5.6|S-Cross 1.4 Boosterjet Hybrid:5.8|S-Cross 1.5 Full Hybrid:5.6|Jimny 1.5:7.9|Swace 1.8 Hybrid:4.5|Across PHEV (Hybrid-Modus):5.8|Celerio 1.0:4.5',
    d: 'Vitara 1.6 DDiS:4.9|S-Cross 1.6 DDiS:4.6',
    e: 'e Vitara:15.0'
  },
  'Tesla': {
    e: 'Model 3 Standard / RWD:13.2|Model 3 Long Range:13.5|Model 3 Performance:15.7|Model Y Standard / RWD:14.9|Model Y Long Range AWD:15.4|Model Y Performance:16.9|Model S:17.5|Model X:19.5|Cybertruck:26.0'
  },
  'Toyota': {
    b: 'Aygo 1.0:4.9|Aygo X 1.0:4.9|Aygo X Hybrid (2025):4.0|Yaris 1.0:5.0|Yaris 1.5:5.4|Yaris Hybrid 116:3.9|Yaris Hybrid 130:4.0|Yaris Cross Hybrid:4.5|Yaris Cross Hybrid AWD-i:5.0|GR Yaris:8.4|Auris 1.2 Turbo:5.6|Auris Hybrid:4.2|Corolla 1.2 Turbo:6.2|Corolla 1.8 Hybrid:4.5|Corolla 2.0 Hybrid:4.8|Corolla Touring Sports 1.8 Hybrid:4.6|Corolla Cross 2.0 Hybrid:5.2|C-HR 1.8 Hybrid:4.9|C-HR 2.0 Hybrid:5.0|C-HR 1.2 Turbo (bis 2019):6.5|Prius Hybrid:4.0|Prius+ Hybrid:4.6|RAV4 2.5 Hybrid:5.6|RAV4 2.5 Hybrid AWD-i:5.8|RAV4 2.0 (bis 2018):7.6|Camry 2.5 Hybrid:5.3|Highlander 2.5 Hybrid:7.1|GR86 2.4:9.3|Supra 2.0:7.1|Supra 3.0:8.1|Verso 1.6:7.0|Proace City Verso 1.2:6.9',
    d: 'Auris 1.4 D-4D:4.2|Avensis 1.6 D-4D:4.6|Verso 1.6 D-4D:4.9|RAV4 2.0 D-4D:5.6|Land Cruiser 2.8 D-4D:9.8|Land Cruiser 250 2.8 D-4D:10.1|Hilux 2.4 D-4D:8.6|Hilux 2.8 D-4D:9.6|Proace City Verso 1.5 D:5.7|Proace Verso 2.0 D:7.3|Proace 2.0 D:7.3',
    e: 'bZ4X FWD:14.4|bZ4X AWD:16.7|bZ4X (2025) FWD:13.8|Urban Cruiser BEV:14.6|C-HR+:15.5|Proace City Electric:19.5|Proace Verso Electric:25.0'
  },
  'Volvo': {
    b: 'XC40 B3:7.3|XC40 B4:7.7|XC40 T3 (bis 2020):7.4|XC60 B4:8.0|XC60 B5 AWD:8.6|XC60 T5 (bis 2020):8.2|XC90 B5 AWD:9.4|XC90 B6 AWD:9.8|S60 B4:7.3|V60 B4:7.4|V60 B5:7.6|S90 B5:7.7|V90 B4:7.6|V90 B5:7.8|V40 T3:5.8|V40 T2:5.5',
    d: 'XC40 D3 (bis 2020):5.4|XC60 B4 Diesel:6.3|XC60 B4 Diesel AWD:6.7|XC60 D4 (bis 2020):5.7|XC90 B5 Diesel AWD:7.4|XC90 D5 (bis 2020):6.6|V60 B4 Diesel:5.4|V60 D4 (bis 2020):5.0|V90 B4 Diesel:5.6|V90 Cross Country B5 Diesel:6.4|V40 D2:3.9|V40 D3:4.2|V70 D4:5.2|S60 D4 (bis 2018):4.9',
    e: 'EX30 Single Motor:15.4|EX30 Twin Motor Performance:16.7|EC40 Single Motor:16.8|EX40 Single Motor:16.5|EX40 Twin Motor:18.5|XC40 Recharge Pure Electric:18.7|C40 Recharge:17.6|EX90 Twin Motor:20.9|ES90:17.0'
  },
  'VW': {
    b: 'up! 1.0 MPI 65:4.9|up! GTI 1.0 TSI:5.6|Polo 1.0 MPI 80:5.4|Polo 1.0 TSI 95:5.3|Polo 1.0 TSI 116:5.4|Polo GTI 2.0 TSI:6.8|Polo (6R) 1.2 TSI:5.0|T-Cross 1.0 TSI 95:5.7|T-Cross 1.0 TSI 116:5.7|T-Cross 1.5 TSI 150:6.0|Taigo 1.0 TSI 95:5.5|Taigo 1.0 TSI 116:5.5|Taigo 1.5 TSI 150:5.9|Golf 1.0 TSI 110:5.4|Golf 1.0 eTSI 110:5.3|Golf 1.5 TSI 130:5.5|Golf 1.5 TSI:5.6|Golf 1.5 eTSI 150:5.6|Golf GTI 2.0 TSI:6.9|Golf R 2.0 TSI:8.2|Golf 7 1.0 TSI:4.9|Golf 7 1.2 TSI:5.1|Golf 7 1.4 TSI:5.3|Golf 7 1.5 TSI:5.2|Golf 6 1.4 TSI:6.2|Golf 6 1.6:7.4|Golf Variant 1.5 eTSI 150:5.7|Golf Sportsvan 1.5 TSI:5.9|Golf Plus 1.4 TSI:6.4|Beetle 1.2 TSI:5.6|Jetta 1.4 TSI:6.0|Scirocco 1.4 TSI:6.0|T-Roc 1.0 TSI 115:6.2|T-Roc 1.5 TSI 150:6.4|T-Roc 1.5 eTSI 150 (2025):5.9|T-Roc 2.0 TSI 190 4MOTION:7.8|T-Roc R 2.0 TSI:8.7|Tiguan 1.5 eTSI 130:6.9|Tiguan 1.5 eTSI 150:7.0|Tiguan 2.0 TSI 204 4MOTION:8.4|Tiguan 2.0 TSI 265 4MOTION:8.6|Tiguan (AD) 1.4 TSI:7.0|Tiguan (5N) 1.4 TSI:7.6|Tiguan Allspace 1.5 TSI:7.3|Tayron 1.5 eTSI 150:7.3|Tayron 2.0 TSI 204 4MOTION:8.5|Passat 1.5 eTSI 150:6.4|Passat (B8) 1.5 TSI:6.1|Passat (B8) 1.4 TSI:5.9|Passat (B8) 2.0 TSI 272 4MOTION:7.7|Arteon 2.0 TSI 190:7.0|Arteon R 2.0 TSI:8.7|Touran 1.5 TSI 150:6.6|Touran 1.4 TSI:6.3|Sharan 1.4 TSI:7.0|Touareg 3.0 V6 TSI:10.3|Caddy 1.5 TSI 114:6.7|T-Roc Cabrio 1.5 TSI:6.6|Multivan 2.0 TSI 204:8.9',
    d: 'Polo 1.6 TDI:4.3|Polo (6R) 1.6 TDI:3.9|Golf 2.0 TDI 116:4.3|Golf 2.0 TDI 150:4.5|Golf GTD 2.0 TDI:5.0|Golf 7 1.6 TDI:4.1|Golf 7 2.0 TDI:4.4|Golf 6 1.6 TDI:4.6|Golf 6 2.0 TDI:4.9|Golf Variant 2.0 TDI 116:4.4|Golf Variant 2.0 TDI 150:4.6|Golf Sportsvan 2.0 TDI:4.9|Golf Plus 1.6 TDI:5.1|Jetta 2.0 TDI:4.7|Beetle 2.0 TDI:4.6|Scirocco 2.0 TDI:4.8|T-Roc 2.0 TDI 115:4.9|T-Roc 2.0 TDI 150 4MOTION:5.7|Tiguan 2.0 TDI 150:5.6|Tiguan 2.0 TDI 193 4MOTION:6.4|Tiguan (AD) 2.0 TDI 150:5.8|Tiguan (5N) 2.0 TDI:6.1|Tiguan Allspace 2.0 TDI:6.1|Tayron 2.0 TDI 150:5.8|Tayron 2.0 TDI 193 4MOTION:6.5|Passat 2.0 TDI 150:4.8|Passat 2.0 TDI 193 4MOTION:5.6|Passat (B8) 2.0 TDI 150:4.9|Passat (B8) 2.0 TDI 190:5.3|Passat (B8) 2.0 TDI 240 4MOTION:6.1|Passat (B7) 2.0 TDI:5.0|Passat (B6) 2.0 TDI:5.6|Arteon 2.0 TDI 150:5.2|Arteon 2.0 TDI 200:5.5|Touran 2.0 TDI 122:5.1|Touran 2.0 TDI 150:5.2|Sharan 2.0 TDI 150:5.6|Touareg 3.0 V6 TDI 231:7.5|Touareg 3.0 V6 TDI 286:7.8|Touareg (7P) 3.0 TDI:7.6|Caddy 2.0 TDI 102:5.3|Caddy 2.0 TDI 122:5.4|Caddy Maxi 2.0 TDI:5.6|T5 2.0 TDI 140:8.0|T6 2.0 TDI 150:7.4|T6.1 2.0 TDI 110:7.6|T6.1 2.0 TDI 150:7.8|T6.1 2.0 TDI 199 4MOTION:8.9|Multivan 2.0 TDI 150:7.3|California 2.0 TDI 150:8.4|Crafter 2.0 TDI 140:9.0|Crafter Grand California 2.0 TDI:11.5|Amarok 2.0 TDI:9.0|Amarok 3.0 V6 TDI:9.6',
    e: 'e-up!:12.9|ID.2all:14.0|ID. Polo:13.8|ID.3 Pure:15.3|ID.3 Pro:15.6|ID.3 Pro S:15.7|ID.3 GTX:16.6|ID.4 Pure:15.9|ID.4 Pro:16.7|ID.4 Pro 4MOTION:17.8|ID.4 GTX:18.2|ID.5 Pro:16.3|ID.5 GTX:17.6|ID.7 Pro:14.1|ID.7 Pro S:14.7|ID.7 Tourer Pro S:15.1|ID.7 GTX:16.4|ID. Buzz Pro:20.5|ID. Buzz LWB:21.0|ID. Buzz GTX:22.0|e-Golf:13.2|e-Crafter:21.5|ID. Every1:13.5'
  },
  'XPeng': {
    e: 'G6 RWD:16.5|G6 AWD:18.5|G9:19.5|P7:16.5|P7+:15.5'
  },
  'Zeekr': {
    e: '001:18.7|7X:17.0|X:16.5'
  }
};
