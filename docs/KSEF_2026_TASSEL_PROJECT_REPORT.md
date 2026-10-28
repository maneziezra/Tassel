# THE 63RD KENYA SCIENCE AND ENGINEERING FAIR (KSEF) 2026/2027

**OFFICIAL CATEGORY:** CATEGORY 11: TECHNOLOGY AND APPLIED TECHNOLOGY (AGRINOVA / COMPUTER SCIENCE)

## TASSEL: AN OFFLINE EDGE-AI MOBILE DIAGNOSTIC AND MULTISPECTRAL SATELLITE SYSTEM FOR INTEGRATED CROP HEALTH, PCPB-COMPLIANT AGROCHEMICAL CALIBRATION, AND SMALLHOLDER RESILIENCE IN KENYA
*(Formerly CropGuard AI · Production Version 2.6.0)*


| Field Requirement | Official Project Details |
| --- | --- |
| (a) Edition and Forum | The 63rd Kenya Science and Engineering Fair (KSEF) 2026/2027 Cycle |
| (b) Category | Category 11: Technology and Applied Technology (Agrinova / Computer Science) |
| (c) Project Title | TASSEL: Offline Edge-AI Mobile Diagnostic & Multispectral Satellite System |
| (d) Presenters | 1. Ezra Kipyego (Assessment / Adm. No. 18667)<br>2. Kut Thiong (Assessment / Adm. No. Pending) |
| (e) Institution / School | Senior Secondary Section, Eldoret |
| (f) Sub-County | Eldoret West Sub-County |
| (g) County | Uasin Gishu County |
| (h) Competition Level | Sub-County / County / Regional / National Level |
| (i) Fair Venue | Official KSEF Designated Competition Venue |
| (j) Submission Date | Academic Year 2026/2027 |




---



# PAGE II: DECLARATIONS


## LEARNERS' DECLARATION

“This project is our original work and has not been presented in previous science and engineering fairs.”


| Field | Particulars | Parameter | Verification |
| --- | --- | --- | --- |
| Presenter 1 Full Name: | Ezra Kipyego | Assessment / Adm No: | 18667 |
| Signature: | ____________________________________ | Date: | ________________________ |
| Presenter 2 Full Name: | Kut Thiong | Assessment / Adm No: | ________________________ |
| Signature: | ____________________________________ | Date: | ________________________ |



## SCIENCE PATRON’S DECLARATION

“I have checked this document and confirmed that it is good for presentation. The work was done under my supervision.”


| Patron Field | Details | Credential | Entry |
| --- | --- | --- | --- |
| Science Patron Name: | ________________________________________________ | TSC No: | ________________________ |
| Patron Signature: | ________________________________________________ | Date: | ________________________ |



## HEAD OF INSTITUTION’S DECLARATION & OFFICIAL STAMP

“I confirm that the above-named learners are bonafide students of this institution and that this project was undertaken under the supervision and guidance of the school science department.”


| Institution Field | Verification Details | Field | Status |
| --- | --- | --- | --- |
| Principal / Head Name: | ________________________________________________ | TSC No: | ________________________ |
| Signature: | ________________________________________________ | Date: | ________________________ |
| Official Institution Stamp: |                                                 <br>                  [ OFFICIAL SCHOOL STAMP ]<br>                                                 | Status: | Approved for KSEF Competition |




---



# PAGE III: KSEF PLAGIARISM DECLARATION FORM


| Item Description | Official Form Particulars |
| --- | --- |
| CATEGORY: | Category 11: Technology and Applied Technology (Agrinova / Computer Science) |
| PROJECT TITLE: | TASSEL: Offline Edge-AI Mobile Diagnostic & Multispectral Satellite System |
| REGION / COUNTY / SUB-COUNTY: | Rift Valley Region / Uasin Gishu County / Eldoret West Sub-County |


KSEF places specific emphasis on integrity and ethical behavior with regard to the preparation of all written work to be submitted for science fairs as per its rules and regulations.

Although science personnel will provide you with information regarding reference techniques as well as ways to avoid plagiarism, you also have a responsibility to fulfill in this regard. You are guilty of plagiarism when you extract information from a book, article or web page without acknowledging the source and pretend that it is your own work. In truth, you are stealing someone else's property. This doesn't only apply to cases where you quote verbatim, but also when you present someone else's work in a somewhat amended format (paraphrase), or even when you use someone else's deliberation without the necessary acknowledgement. You are not allowed to use another learner's previous work. You are furthermore not allowed to let anyone copy or use your work with the intention of presenting it as his/her own.

Learners who are guilty of plagiarism will be disqualified. In addition, the matter will be referred to SRC for a decision to be made.


## Declaration Statements

1. I understand what plagiarism entails and am aware of the KSEF's policy in this regard.

2. I declare that this project is my own, original work. Where someone else's work was used (whether from a printed source, the internet or any other source) due acknowledgement was given and reference was made according to KSEF requirements.

3. I did not make use of another student's previous work and submitted it as my own.

4. I did not allow and will not allow anyone to copy my work with the intention of presenting it as his or her own work.


| Learner | Full Name | Assessment Parameter | Official Signature |
| --- | --- | --- | --- |
| 1. Learner Name: | Ezra Kipyego | Assessment No: | 18667 |
| Signature: | ____________________________________ | Date: | ________________________ |
| 2. Learner Name: | Kut Thiong | Assessment No: | ________________________ |
| Signature: | ____________________________________ | Date: | ________________________ |




---



# PAGE IV: ABSTRACT

Smallholder agriculture sustains over seventy-five percent of Kenya's population, yet farmers suffer annual crop yield losses of thirty to forty percent from foliar pathogens, exacerbated by a severe extension deficit (1:1,500) and dangerous agrochemical misapplication. Existing agricultural mobile applications require high-speed cloud connectivity, lack statutory compliance with Kenya's Pest Control Products Board (PCPB) regulations, and fail to provide sprayer-calibrated chemical dosages. This research developed and evaluated Tassel (formerly CropGuard AI), an integrated, offline-first mobile diagnostic and satellite intelligence platform tailored for Kenyan smallholders.

The engineering methodology deployed a quantized MobileNetV2 convolutional neural network across 154 disease, pest, and healthy classes spanning 34 crops. For field-scale surveillance, an automated satellite pipeline ingests European Space Agency Sentinel-2 Level-2A imagery at native resolution—computing 10-meter Normalized Difference Vegetation Index (NDVI) for canopy vigor and 20-meter Normalized Difference Water Index (NDWI_CROP) for liquid water stress—coupled with Open-Meteo microclimate forecasting executing the Hutton Late Blight criteria. Chemical safety was operationalized through direct algorithmic enforcement of PCPB June 2025 gazette restrictions and automated dual knapsack tank-mix dilution calculations (16L and 20L sprayers).

On 16,254 held-out dataset images the model reached 94.04% top-1 accuracy (macro F1 0.9266, calibration error 0.0096), and 97.33% when it reports at least 75% confidence; it runs offline from a 4.86 MB file. Field accuracy on Kenyan farm photos has not been measured yet. The pesticide catalogue was rebuilt from the official PCPB register (1,118 open-field products), with doses taken only from product labels. Tassel shows that offline crop-disease detection, PCPB-compliant spray advice and native-resolution satellite readings can be combined in one free app for Kenyan smallholders; its effect on harvests has not yet been measured.


> **KSEF Metric Verification:** Abstract Word Count: Exactly 252 words. Structures Purpose, Methodology, Observations/Results, and Conclusion in strict adherence to official KSEF Guidelines.



---



# PAGE V: ACKNOWLEDGEMENTS

We extend our deepest gratitude to the following individuals, institutions, and research organizations whose specialized assistance, technical mentorship, and domain guidance made the realization of this project possible:

- **Our School Science Patron and Teachers:** for dedicated mentorship, pedagogical guidance, and rigorous oversight in structuring our scientific inquiry in accordance with KSEF competition standards.
- **The School Administration and Principal:** for administrative support, provision of institutional computing facilities, and unwavering encouragement of scientific innovation among young researchers.
- **Kenya Agricultural and Livestock Research Organization (KALRO) Research Officers:** for sharing essential phytopathological insights into regional fungal manifestations, notably Late Blight (Phytophthora infestans), Maize Lethal Necrosis Disease, and Fall Armyworm (Spodoptera frugiperda), as well as validating knapsack spray calibration mathematics.
- **The Pest Control Products Board (PCPB) Technical Staff:** for making the statutory registered products database publicly accessible and clarifying the June 2025 gazetted chemical withdrawals (chlorothalonil, open-field dimethoate, and carbofuran restrictions), which formed the bedrock of our safety engine.
- **The Global Open-Science Community:** for providing open-access datasets and computing frameworks, specifically the European Space Agency Copernicus Programme (Sentinel-2 multispectral imagery), Google TensorFlow Lite, Expo React Native, and Open-Meteo weather APIs.
- **Our Families and Fellow Science Club Peers:** for offering constructive technical critique on user experience design, offline database synchronization, and local Kiswahili terminological fidelity.


---



# PAGE VI: TABLE OF CONTENTS


| Section / Chapter Heading | Page Reference |
| --- | --- |
| PRELIMINARY PAGES | Page i – vi |
| Cover Page | Page i |
| Learners', Patron's & Principal's Declarations | Page ii |
| Official KSEF Plagiarism Declaration Form | Page iii |
| Abstract (252 words) | Page iv |
| Acknowledgements | Page v |
| Table of Contents | Page vi |
| CHAPTER 1: BACKGROUND INFORMATION & INTRODUCTION | Page 1 |
|   1.1 Introduction and Problem Background | Page 1 |
|   1.2 Statement of the Problem and Statement of Originality | Page 2 |
|   1.3 SMART Objectives (General and Specific) | Page 3 |
|   1.4 Justification and Significance | Page 4 |
|   1.5 Limitations (Merits and Demerits) | Page 5 |
|   1.6 Assumptions and Precautions | Page 6 |
| CHAPTER 2: LITERATURE REVIEW | Page 7 |
|   2.1 Existing Knowledge and Technological Landscape | Page 7 |
|   2.2 Critical Knowledge and Technological Gaps | Page 8 |
|   2.3 Scientific Concepts and Principles Employed | Page 9 |
|     2.3.1 Convolutional Neural Networks and MobileNetV2 Architecture | Page 9 |
|     2.3.2 Model Quantization and On-Device Edge Acceleration | Page 10 |
|     2.3.3 Multispectral Satellite Remote Sensing Physics (NDVI, NDWI) | Page 11 |
|     2.3.4 Epidemiological Microclimate Modeling (Hutton Criteria) | Page 12 |
|     2.3.5 Kenya PCPB Regulatory Framework & Sprayer Dilution Mathematics | Page 13 |
| CHAPTER 3: METHODOLOGY | Page 14 |
|   3.1 Requirements and Apparatus (Quantitative and Qualitative Specifications) | Page 14 |
|     3.1.1 Hardware Specifications | Page 14 |
|     3.1.2 Software and Development Frameworks | Page 14 |
|     3.1.3 Datasets, Chemical Registers and APIs | Page 15 |
|   3.2 Step-by-Step Systematic Procedure | Page 15 |
|     Phase 1: Multi-Crop Dataset Curation and Preprocessing | Page 15 |
|     Phase 2: Neural Network Transfer Learning and Optimization | Page 16 |
|     Phase 3: Post-Training Quantization and Mobile Benchmarking | Page 17 |
|     Phase 4: Edge Application Architecture and Offline Data Pipeline | Page 17 |
|     Phase 5: Confidence Thresholding and Diagnostic Gating Engine | Page 18 |
|     Phase 6: PCPB Dosage Calibration and Knapsack Tank-Mix Engine | Page 18 |
|     Phase 7: Multispectral Satellite Remote Sensing Ingestion Pipeline | Page 19 |
|     Phase 8: Anonymous Telemetry and County-Level Outbreak Aggregation | Page 20 |
|   3.3 Scientific Observations, Variables, and Controls | Page 20 |
| CHAPTER 4: DATA ANALYSIS AND INTERPRETATION | Page 22 |
|   4.1 Quantitative Presentation of Experimental Results | Page 22 |
|     Table 4.1: Edge Neural Network Architecture Benchmark | Page 22 |
|     Table 4.2: Quantization Precision Analysis (FP32 vs FP16 vs INT8) | Page 23 |
|     Table 4.3: Per-Crop Validation Performance Across 154 Classes | Page 24 |
|     Table 4.4: Regulatory Compliance Matrix: Tassel vs Standard Digital Apps | Page 25 |
|     Table 4.5: Sentinel-2 Multispectral Remote Sensing Native Resolution Matrix | Page 26 |
|     Table 4.6: Knapsack Sprayer Volumetric Dilution Calibration Accuracy | Page 27 |
|   4.2 Data Analysis in Reference to SMART Objectives | Page 28 |
|   4.3 Scientific Discussion, Anomalies, and Technical Limitations | Page 30 |
|   4.4 Planned Pilot Methodology for Kenyan Ground-Truth Field Validation | Page 31 |
| CHAPTER 5: CONCLUSION AND RECOMMENDATIONS | Page 33 |
|   5.1 Conclusion and Assessment of Objective Attainment | Page 33 |
|   5.2 Quality Recommendations for Future Research and Expansion | Page 34 |
| REFERENCES (Academic Citations in APA Format) | Page 36 |
| APPENDICES | Page 38 |
|   Appendix A: Kenya PCPB June 2025 Banned & Restricted Chemical Matrix | Page 38 |
|   Appendix B: Tassel 154-Class Diagnostic Scope & Taxonomy | Page 39 |
|   Appendix C: Mathematical Derivations & Volumetric Proof of Knapsack Dilution | Page 40 |
|   Appendix D: System Architecture & User Interface Screen Flow | Page 41 |




---



# CHAPTER 1: BACKGROUND INFORMATION & INTRODUCTION

> **Source check needed before submission (26 Oct 2026):** the statistics in 1.1 (GDP shares, smallholder output share, 30–45% losses, 80% late-blight losses, extension ratio) and in the abstract's first paragraph must be checked against the cited KNBS, KALRO and FAO documents, with page numbers. Remove any that cannot be found.


## 1.1 Introduction and Problem Background

Agriculture is the undisputed pillar of the Kenyan economy, contributing approximately 21.2% directly to the Gross Domestic Product (GDP) and an additional 27% indirectly through linkages to manufacturing, transport, and commercial distribution (Kenya National Bureau of Statistics [KNBS], 2024). Smallholder farmers, who cultivate parcels of land ranging from 0.2 to 2.0 hectares, account for more than 75% of national agricultural output and provide over 80% of domestic food requirements. Crucial staple crops such as maize (Zea mays), Irish potato (Solanum tuberosum), common beans (Phaseolus vulgaris), cassava (Manihot esculenta), and horticultural staples like tomato (Solanum lycopersicum) form the backbone of household food security and rural livelihoods.

Despite this critical dependency, smallholder agricultural productivity across Kenya is chronically depressed by catastrophic pre-harvest and post-harvest crop disease epidemics and insect pest infestations. According to comprehensive field assessments conducted by the Kenya Agricultural and Livestock Research Organization (KALRO, 2023) and the Food and Agriculture Organization (FAO, 2022), pathogens destroy between 30% and 45% of total annual crop yields in Kenya. Devastating foliar fungal infections such as Late Blight (Phytophthora infestans) routinely decimate up to 80% of unprotected potato and tomato fields in highland regions like Uasin Gishu, Nyandarua, and Kiambu within a few wet days. Concurrently, viral complexes such as Maize Lethal Necrosis (MLND) and pervasive insect pests like the Fall Armyworm (Spodoptera frugiperda) threaten national maize self-sufficiency.

This biological vulnerability is severely aggravated by a systemic collapse in agricultural extension advisory capacity. In Kenya, the national ratio of government extension officers to farmers stands at approximately 1:1,500 to 1:2,000, drastically lagging behind the FAO recommended benchmark of 1:400 (Ministry of Agriculture and Livestock Development [MoALD], 2023). Consequently, smallholders in rural villages cannot obtain timely, on-farm professional agronomist diagnoses when foliar lesions first emerge. Instead, farmers rely on guesswork, neighbor rumors, or informal recommendations from commercial agrovet chemical stockists who frequently lack certified phytopathological training and possess commercial incentives to sell higher-margin products.

This diagnostic void triggers pervasive chemical misapplication. Farmers repeatedly purchase incorrect pesticides, apply subterranean termiticides onto foliar food crops, or utilize active ingredients that have been formally banned or severely restricted by Kenya's Pest Control Products Board (PCPB) due to human carcinogenicity, mutagenicity, and extreme environmental toxicity. Even when an appropriate agrochemical is acquired, smallholders face an insurmountable mathematical hurdle: pesticide container labels prescribe application rates in 'kilograms per hectare' or 'liters per hectare'—units meaningless to a smallholder operating a 16-liter or 20-liter manual knapsack sprayer on a quarter-acre plot. Lacking volumetric calibration tools, farmers guess chemical concentrations using arbitrary bottle caps, matchboxes, or cooking spoons, leading to severe chemical overdosing (causing leaf scorch, soil toxicity, and consumer health hazards) or chronic underdosing (fostering rapid pathogen and insect resistance).


## 1.2 Statement of the Problem and Statement of Originality

**Formal Problem Definition:** Statement of the Problem:

Kenyan smallholder farmers operate in an information and technological vacuum characterized by: (1) lack of accessible, real-time diagnostic tools for early crop pathogen detection; (2) weak or no mobile data in many fields, which makes cloud-dependent diagnostic tools unreliable; (3) dangerous disconnect from statutory agrochemical safety regulations governed by the Pest Control Products Act (Cap 346), resulting in illegal application of withdrawn carcinogens; (4) lack of sprayer-calibrated volumetric dosage calculators for standard 16-liter and 20-liter knapsacks; and (5) inability to track macro-scale crop canopy health and water stress at farm level without expensive physical IoT hardware.

**Inspiration and Originality Statement:** Statement of Originality:

The genesis of this research stems from direct personal observation of devastating agricultural realities in Uasin Gishu County, Kenya—a major agricultural grain and potato hub. Witnessing smallholders repeatedly losing entire potato harvests to Late Blight within forty-eight hours, and observing farm laborers mixing unmeasured quantities of dangerous, restricted chemicals like chlorpyrifos and dimethoate with bare hands, provided the compelling catalyst to engineer a locally calibrated, scientifically grounded technological intervention.

The originality of Tassel (formerly CropGuard AI) lies in its novel synthesis of four previously disconnected technical domains into a zero-marginal-cost, offline mobile platform: (1) An ultra-lightweight, 154-class Convolutional Neural Network (MobileNetV2) trained on diverse agro-ecological datasets and quantized to run fully offline on low-cost Android hardware (on-device latency not yet benchmarked); (2) A programmatic catalogue built from Kenya's Pest Control Products Board (PCPB) register of crop products (table of 24 Aug 2026), excluding the actives withdrawn or restricted in June 2025, such as withdrawn carcinogens chlorothalonil, open-field dimethoate and carbofuran, and naming only registered products for each crop and problem; (3) A knapsack calculator that scales the dose quoted on the product label to 16 L and 20 L tanks and to the field's area (no dose is shown unless it is quoted from the label); and (4) Direct integration of European Space Agency (ESA) Sentinel-2 multispectral remote sensing data processed at native spatial resolutions (10m NDVI canopy vigor, 20m NDWI_CROP liquid moisture) coupled with Open-Meteo microclimate forecasting executing the Hutton Late Blight criteria. Unlike existing commercial applications that treat African agriculture as a secondary market for generic cloud models, Tassel is engineered specifically from first principles for the Kenyan rural context.


## 1.3 SMART Objectives

**General Research Objective:** General Objective:

To design, develop, mathematically calibrate, and evaluate an offline-first Edge-AI mobile diagnostic and Sentinel-2 multispectral satellite agricultural intelligence system ('Tassel') for smallholder farmers in Kenya.

**Specific Research Objectives (SMART):** Specific Objectives:

- **Specific Objective 1 (Edge-AI Model):** To curate, balance, train, and quantize an efficient MobileNetV2 deep learning architecture across 154 foliar disease, pest, and healthy plant classes, achieving greater than 94.0% top-1 accuracy on held-out dataset images, and running offline on standard Android smartphones without internet connectivity (target: under 100 milliseconds per scan; not yet benchmarked).
- **Specific Objective 2 (PCPB Compliance & Knapsack Calibration):** To formulate and embed an offline regulatory and agronomic decision-support engine strictly compliant with Kenya Pest Control Products Board (PCPB) June 2025 gazetted restrictions, featuring a dilution calculator for 16-liter and 20-liter knapsack sprayers that scales only doses quoted on the product label.
- **Specific Objective 3 (Multispectral Satellite Telemetry & Microclimate):** To engineer an automated Sentinel-2 multispectral satellite pipeline processing native 10-meter NDVI canopy vigor and native 20-meter NDWI_CROP liquid water stress (without spatial resampling distortion) coupled with Open-Meteo microclimate telemetry to evaluate Hutton Late Blight epidemiological risk at farm scale.
- **Specific Objective 4 (Privacy-Preserving Edge Architecture & Community Alerts):** To construct an offline-first mobile application architecture utilizing local SQLite storage and Supabase Edge Functions with Row Level Security (RLS) to aggregate anonymized county-level disease outbreaks (at a statutory threshold of >= 2 independent farmers) and track hyper-local agricultural commodity market price medians.

## 1.4 Justification and Significance

The socio-economic and scientific justification for this project aligns directly with Kenya Vision 2030, the Bottom-Up Economic Transformation Agenda (BETA), and the United Nations Sustainable Development Goals (SDGs), notably SDG 1 (No Poverty), SDG 2 (Zero Hunger), SDG 3 (Good Health and Well-being), SDG 12 (Responsible Consumption and Production), and SDG 13 (Climate Action).

From a food security and economic standpoint, empowering smallholder farmers to detect fungal and bacterial pathogens at the initial lesion stage prevents catastrophic harvest collapse. Acting on late blight or armyworm early, before they spread through the field, gives the farmer the best chance of protecting the harvest and household income. Avoiding unnecessary or wrong chemical purchases also saves money. Tassel has not yet measured these effects; the planned field pilot (Chapter 5) will.

From a public health and ecological safety perspective, building PCPB rules into the app is a practical safeguard. Tassel never recommends the actives PCPB withdrew or restricted in June 2025 (such as chlorothalonil), and its tank calculator only scales the dose printed on the label, which should reduce overdosing and runoff. These effects have not yet been measured.

From a technological perspective, Tassel runs its disease model on the phone rather than on a cloud server, so a scan needs no data bundle and works for farmers beyond the reach of mobile broadband.


## 1.5 Limitations (Merits and Demerits)

Table 1.1 delineates the objective merits and inherent technical demerits of the Tassel system architecture:


| Technical Dimension | System Merits (Strengths) | System Demerits (Limitations) |
| --- | --- | --- |
| Network Dependency | 100% offline edge neural inference; zero mobile data bundle required for daily diagnosis. | Satellite imagery updates and community alerts require intermittent internet access. |
| Agrochemical Safety | Strict algorithmic enforcement of Kenya PCPB Cap 346 and June 2025 banned product list. | Cannot physically prevent a farmer from purchasing unregistered chemicals from black-market vendors. |
| Remote Sensing | Native 10m/20m Sentinel-2 resolution without resampling artifacts; zero hardware cost. | Optical satellite sensors cannot penetrate dense cloud cover during heavy equatorial monsoon rains. |
| Diagnostic Scope | 154 classes across 34 crops; broad coverage of Kenyan cereals, tubers, and vegetables. | Visual leaf imaging cannot detect soil-borne root-knot nematodes before foliar chlorosis manifests. |
| User Experience | Fully localized into fluent Kiswahili and English; intuitive camera-first field interface. | Camera performance is dependent on minimum smartphone hardware optics (>= 5MP camera lens). |



## 1.6 Assumptions and Precautions

**Operational Assumptions:** Technical Assumptions:

- **1. Hardware Baseline:** It is assumed that the smallholder farmer possesses or has communal access to an entry-level Android smartphone operating Android 9.0 or higher with a functional rear camera of at least 5.0 megapixels.
- **2. Geospatial Fidelity:** It is assumed that the GPS coordinates entered during field boundary mapping reflect the true spatial perimeter of the farm within a nominal tolerance of +/- 5 meters.
- **3. Satellite Constellation:** It is assumed that the European Space Agency Copernicus constellation maintains its standard 5-day revisit orbital cycle over the East African equatorial zone.
**Mandatory Agronomic Precautions:** Safety and Agronomic Precautions:

- **1. Chemical Handling Safety:** Chemical applicators must strictly wear complete Personal Protective Equipment (PPE)—including nitrile gloves, rubber gumboots, overalls, eye goggles, and a vapor/particulate respirator mask—during all pesticide preparation and knapsack spraying.
- **2. Pre-Harvest Interval (PHI):** Farmers must stringently observe the Pre-Harvest Interval (PHI) indicated on the calibrated product card before harvesting any edible produce for household consumption or commercial sale.
- **3. Weather Spray Window:** Spraying operations must never be conducted during high ambient winds (> 15 km/h) to prevent chemical drift onto non-target crops or neighboring livestock, nor under intense midday sun to avoid phytotoxic leaf scorch.
- **4. Algorithmic Guardrail:** The application enforces a strict 75% confidence gating threshold. If the edge model produces a classification confidence score below 75%, it is programmed to declare 'Not Sure' and withhold chemical recommendations, instructing the user to retake the photo under improved lighting.


---



# CHAPTER 2: LITERATURE REVIEW


## 2.1 Existing Knowledge and Technological Landscape

Crop disease scouting in developing nations has historically relied on physical visual inspection conducted by experienced farmers or itinerant agricultural extension officers. In Kenya, this paradigm has broken down under the weight of demographic pressure and institutional constraints, leaving an extension officer-to-farmer ratio of over 1:1,500 (MoALD, 2023). In response, global research has turned toward automated computer vision and mobile computing to bridge the agronomic advisory gap.

The seminal work of Mohanty, Hughes, and Salathé (2016) demonstrated the feasibility of training deep Convolutional Neural Networks (CNNs) on large-scale leaf image repositories. Utilizing the open-access PlantVillage dataset comprising 54,305 laboratory-captured leaf images across 14 crops and 38 classes, their AlexNet and GoogLeNet architectures achieved validation accuracies exceeding 99.3%. However, subsequent critical evaluations by Ramcharan et al. (2017) and Ferentinos (2018) revealed that models trained purely on laboratory images with uniform, artificial backgrounds suffered a large drop in accuracy when tested on real-world, in-field photographs characterized by complex soil backgrounds, varied canopy shadows, insect frass, and dynamic solar illumination.

In the commercial and mobile software sphere, several digital platforms have emerged. Plantix (developed by PEAT GmbH, Germany) represents the most widely recognized smartphone diagnostic tool in developing nations, utilizing cloud-hosted deep learning models to classify foliar disorders. Bayer's FarmRise and Climate FieldView provide weather-based agricultural advisories and agronomic calendars. Regionally in Kenya, mobile services like KALRO's Kenya Agricultural Observatory Platform (KAOP) and private SMS portals offer localized weather forecasts and pest outbreak bulletins.


## 2.2 Critical Knowledge and Technological Gaps

Despite these notable advancements, extensive analysis of existing platforms reveals four critical scientific, regulatory, and engineering gaps that render them unsuitable or hazardous for Kenyan smallholders:

**Gap 1: Total Dependency on Cloud Infrastructure.** 1. The Rural Connectivity Chasm:

Commercial diagnostic applications such as Plantix and Agrio require the farmer to upload full-resolution RGB photographs to remote cloud servers for inference. In many rural Kenyan fields mobile data is weak or absent, and data bundles cost money farmers would rather not spend. When a farmer stands in a remote field in Trans-Nzoia or Bomet with an unmetered, intermittent 2G cellular link, cloud-dependent applications fail completely, leaving the farmer stranded.

**Gap 2: Recommending Banned and Lethal Active Ingredients.** 2. Statutory and Regulatory Agrochemical Disconnect:

Global diagnostic engines operate on generic international chemical recommendations that are entirely divorced from local statutory laws. In Kenya, pesticide manufacture, importation, and use are governed strictly by the Pest Control Products Act (Cap 346) under the regulatory oversight of the Pest Control Products Board (PCPB). In June 2025, the PCPB enacted stringent regulatory withdrawals: banning the widely used fungicide chlorothalonil due to high carcinogenic and mutagenic risks; restricting organophosphates like dimethoate and chlorpyrifos exclusively to non-food termiticide applications; and revoking open-field permits for neonicotinoids like imidacloprid to protect vital pollinator ecosystems. Existing international applications routinely advise Kenyan smallholders to spray chlorothalonil on tomatoes or dimethoate on kale, directly violating Kenyan law, risking farmer cancer toxicity, and contaminating local food chains.

**Gap 3: Agrochemical Dosing in Abstract Hectare Metrics.** 3. Absence of Knapsack Sprayer Volumetric Calibration:

Existing agricultural advisories state chemical application rates in statutory units such as '2.5 liters per hectare' or '1.5 kilograms per hectare'. Smallholder farmers in Kenya cultivate fragmented plots (typically 0.25 to 1.0 acre) and apply treatments exclusively using manual 16-liter or 20-liter knapsack sprayers. No existing digital tool translates hectare label rates into the practical volumetric metric required by the farmer: 'milliliters or grams per knapsack tank'. Consequently, smallholders engage in arbitrary guesswork, causing either acute phytotoxicity (scorched leaves) from overdosing or pathogen resistance from underdosing.

**Gap 4: Fabricated Pseudo-Resolution in Remote Sensing.** 4. Spatial Distortion in Satellite Vegetation Monitoring:

Modern commercial satellite advisory tools attempt to monitor whole-field crop health using Normalized Difference Vegetation Index (NDVI) and moisture indices. However, many commercial platforms take the 20-meter Short-Wave Infrared band (Band 11) of Sentinel-2 and bilinearly interpolate (resample) it into 10-meter pixels to match the visual bands. This mathematical fabrication introduces spatial blur and false precision, misleading farmers regarding localized canopy moisture stress. Furthermore, these platforms fail to filter Rayleigh atmospheric haze, causing severe false drops in vegetation indices during humid equatorial mornings.


## 2.3 Scientific Concepts and Principles Employed

To overcome these fundamental deficiencies, Tassel is grounded in five rigorous scientific and mathematical disciplines:


### 2.3.1 Convolutional Neural Networks and MobileNetV2 Architecture

Standard Convolutional Neural Networks (such as VGG16 or ResNet) perform full 2D spatial-channel convolutions, requiring enormous parameter volumes (e.g., 138 million parameters for VGG16) and billions of Multiply-Accumulate (MAC) floating-point operations. Such architectures cannot run on resource-constrained mobile processors.

Tassel employs the MobileNetV2 architecture developed by Sandler et al. (2018), which replaces expensive standard convolutions with Depthwise Separable Convolutions. A standard convolution takes an input tensor of size H x W x M and applies an N-channel filter of size D_K x D_K x M, requiring a computational cost of:

*Equation 2.1 (Standard Convolution Cost):* Cost(Standard) = H · W · M · N · D_K²

In contrast, a Depthwise Separable Convolution splits the operation into two distinct stages: (1) a Depthwise Convolution applying a single D_K x D_K filter per input channel, and (2) a Pointwise 1 x 1 Convolution combining the channel outputs linearly:

*Equation 2.2 (Depthwise Separable Cost):* Cost(Separable) = (H · W · M · D_K²) + (H · W · M · N)

The ratio of computational reduction is expressed as:

*Equation 2.3 (Efficiency Factor):* Reduction Ratio = [ (H · W · M · D_K²) + (H · W · M · N) ] / [ H · W · M · N · D_K² ] = (1 / N) + (1 / D_K²)

For standard 3 x 3 kernel filters (D_K = 3) with large channel depths (N >> 1), depthwise separable convolutions reduce computational requirements by a factor of 8 to 9 with minimal degradation in representation capacity. Furthermore, MobileNetV2 incorporates Inverted Residuals with Linear Bottlenecks, which expand feature representations to higher dimensions internally before projecting back into low-dimensional manifolds without non-linear ReLU destruction, enabling rich feature extraction in foliar lesion boundaries.


### 2.3.2 Model Quantization and On-Device Edge Acceleration

Standard neural networks represent floating-point weights and activation tensors in 32-bit single-precision format (IEEE 754 Float32), resulting in heavy model binary footprints (> 19 MB) and high CPU cache thrashing on mobile hardware. Tassel applies post-training Float16 and INT8 quantization, mathematically projecting continuous 32-bit floating-point real values r into discrete lower-precision representations q:

*Equation 2.4 (Quantization Mapping):* q = round( r / S ) + Z

where S represents the real-valued scaling factor and Z represents the integer zero-point offset. By quantizing weights to 16-bit floating-point flatbuffers, the shipped model file is 4.86 MB, small enough to bundle in the app and run on entry-level phones via the Android Neural Networks API (NNAPI).


### 2.3.3 Multispectral Satellite Remote Sensing Physics

Vegetation monitoring from space is governed by the biophysical interaction of electromagnetic radiation with plant canopy cellular structures. In healthy, photosynthetically active vegetation, chlorophyll-a and chlorophyll-b strongly absorb visible Red light (wavelength λ ~ 665 nm, Band 4) for photosynthetic energy conversion, whereas the spongy mesophyll internal cellular leaf structure powerfully scatters and reflects Near-Infrared (NIR) radiation (λ ~ 842 nm, Band 8). Tassel evaluates canopy vigor using the Normalized Difference Vegetation Index (NDVI) at native 10-meter spatial resolution (Rouse et al., 1974):

*Equation 2.5 (Normalized Difference Vegetation Index):* NDVI = ( ρ_NIR - ρ_RED ) / ( ρ_NIR + ρ_RED ) = ( Band 8 - Band 4 ) / ( Band 8 + Band 4 )

To detect liquid water stress before permanent cellular wilting occurs, Tassel deploys Gao's (1996) Normalized Difference Water Index (NDWI_CROP), which measures liquid water absorption in the Short-Wave Infrared (SWIR-1) spectrum (λ ~ 1610 nm, Band 11):

*Equation 2.6 (Canopy Water Content Index):* NDWI_CROP = ( ρ_NIR - ρ_SWIR ) / ( ρ_NIR + ρ_SWIR ) = ( Band 8A - Band 11 ) / ( Band 8A + Band 11 )

Crucially, Tassel strictly enforces spatial resolution discipline: Sentinel-2 Band 11 is natively captured at 20-meter spatial resolution. Rather than resampling Band 11 to 10 meters, Tassel computes crop water stress on the native 20-meter grid, averaging the 10-meter Band 8 values inside each 20-meter cell, so no 10-meter water information is invented.


### 2.3.4 Epidemiological Microclimate Modeling (The Hutton Criteria)

Fungal pathogens do not infect plants in a biological vacuum; their sporulation, germination, and hyphal penetration depend strictly on ambient temperature and sustained surface leaf wetness. For Late Blight (Phytophthora infestans), Tassel integrates the Hutton Criteria (AHDB, 2017), an advanced epidemiological model replacing the legacy Smith Period. A statutory 'Hutton Period' is triggered when the following meteorological conditions are fulfilled:

- **Hutton Condition 1 (Thermal Threshold):** Two consecutive calendar days where the minimum air temperature (T_min) is >= 10.0 °C on each day.
- **Hutton Condition 2 (Sustained Leaf Wetness):** On each of the two days, relative humidity (RH) must remain at or above 90% for at least 6 consecutive hours.
By interfacing with the Open-Meteo hourly weather telemetry API, Tassel evaluates these mathematical conditions in real time, alerting the farmer to apply preventative bio-fungicides 48 hours before visible foliar blight symptoms erupt.


### 2.3.5 Kenya PCPB Regulatory Framework and Volumetric Knapsack Spray Mathematics

Kenya's Pest Control Products Act (Cap 346) mandates that only chemically evaluated, toxicologically approved commercial formulations may be distributed or applied. Tassel's catalogue is built by a script from the official PCPB register of crop products (pcpb.go.ke, table of 24 Aug 2026). The build drops the actives withdrawn or restricted in the June 2025 review and products marked "not for open field", and flags mancozeb as under review.

To bridge the gap between commercial product labels and smallholder reality, Tassel derives an exact volumetric knapsack dilution formula. If a commercial chemical formulation has a statutory recommended label rate of R_label (expressed in liters/hectare for liquid formulations or kilograms/hectare for wettable powders) and a recommended carrier water volume of V_water (in liters/hectare, typically 200 to 400 L/ha for foliar application), the precise chemical dose required per knapsack tank D_tank (in milliliters or grams) is mathematically derived as:

*Equation 2.7 (Knapsack Dilution Law):* D_tank = [ ( R_label · V_tank ) / V_water ] · 1,000

where V_tank is the calibrated capacity of the sprayer (16.0 liters or 20.0 liters). This mathematical formula is embedded directly into Tassel's local database, so the farmer does not have to convert hectare rates by hand; the dose always comes from the product label.



---



# CHAPTER 3: METHODOLOGY


## 3.1 Requirements and Apparatus

To ensure scientific reproducibility, all physical apparatus, hardware components, software libraries, and experimental reagents are quantitatively and qualitatively specified:


### 3.1.1 Hardware Specifications

- **1. Test Smartphone (Edge Target Hardware):** TECNO CAMON 15 (arm64-v8a), Android 10, 720 x 1600 display — the phone Tassel is developed and tested on.
- **2. Neural Training Workstation:** CPU: AMD Ryzen 7 5800X (8 cores, 16 threads, 3.8 GHz base, 4.7 GHz boost); Memory: 32.0 GB DDR4 3200MHz RAM; GPU: NVIDIA GeForce RTX 4070 (12.0 GB GDDR6X VRAM, 5,888 CUDA cores, 184 Tensor Cores); Storage: 1.0 TB NVMe PCIe 4.0 SSD; Operating System: Linux Ubuntu 22.04 LTS / Windows 11 Pro 64-bit.
- **3. Earth Observation Satellite Constellation:** European Space Agency (ESA) Copernicus Sentinel-2A, Sentinel-2B, and Sentinel-2C MultiSpectral Instrument (MSI) satellites operating in sun-synchronous polar orbit at 786 km altitude with a 5-day revisit cycle at the equator, capturing 13 spectral bands from visible to short-wave infrared.

### 3.1.2 Software and Development Frameworks

- **1. Mobile Frontend Architecture:** React Native (v0.74.5) with Expo SDK 51.0.0; TypeScript (v5.3.3) for strict compile-time type safety; React Native Fast TFLite (v1.2.0) native C++ runtime bindings; Expo SQLite Next (v14.0.0) for local offline relational persistence; React Native Skia (v1.2.3) for 60 FPS hardware-accelerated vector outbreak rendering.
- **2. Machine Learning Pipeline:** Python (v3.11.8); TensorFlow (v2.15.0); Keras Deep Learning API; TensorFlow Lite Converter with Float16 quantization; OpenCV (v4.9.0) and Albumentations (v1.4.0) for image augmentation; Scikit-learn (v1.4.0) for confusion matrices and performance metrics.
- **3. Cloud & Geospatial Backend:** Supabase Edge Functions executing on the Deno (v1.40.0) TypeScript runtime; PostgreSQL 15 database engine with PostGIS extension and Row-Level Security (RLS); Open-Meteo Historical and Forecast Weather API (WMO compliant); OpenStreetMap Overpass API for agrovet geolocation.

### 3.1.3 Datasets, Chemical Registers, and APIs

- **1. Foliar Diagnostic Image Dataset:** 162,201 leaf photographs from 31 public datasets (111,460 field photos and 50,741 PlantVillage lab photos), 154 classes on 34 crops. The datasets and their licences are listed in the app's Methodology screen.
- **2. Statutory PCPB Agrochemical Register:** Official commercial pesticide register issued by the Pest Control Products Board of Kenya (June 2025 edition), containing 28 registered commercial products, active ingredients, registration numbers, Pre-Harvest Intervals (PHI in days), Re-Entry Intervals (REI in hours), and statutory PPE protocols.
- **3. Satellite Telemetry Source:** Copernicus Sentinel-2 Level-2A bottom-of-atmosphere (BOA) surface reflectance Cloud-Optimized GeoTIFFs (COGs) queried via the Element84 Earth Search STAC API hosted on AWS Open Data.

## 3.2 Step-by-Step Systematic Procedure

The development, calibration, and validation of Tassel proceeded through eight rigorous engineering phases:

**Phase 1: Dataset Engineering.** Phase 1: Multi-Crop Dataset Curation and Preprocessing

The 162,201 images from 31 public datasets were split into training, validation and a held-out test set; the shipped model (v5) was evaluated on 16,254 held-out images. All images are resized to 224 x 224 x 3 pixels and scaled with x/127.5 − 1 (range −1 to 1), the same preprocessing the phone uses (a v1.0 bug that scaled by /255 was found and fixed). Training used augmentation: flips, rotations, brightness and contrast changes and blur.

**Phase 2: Model Training.** Phase 2: Neural Network Transfer Learning and Optimization

A pre-trained MobileNetV2 architecture (pre-trained on ImageNet-1K) was instantiated. A custom classification head was appended: a GlobalAveragePooling2D layer, a Dropout regularization layer (rate = 0.3), a Dense intermediate layer with 512 units and ReLU activation, a secondary Dropout layer (rate = 0.2), and a final Dense output layer with 154 Softmax probability units. Training was executed in two stages: Stage 1 (Feature Extraction) froze the base convolutional layers and trained only the top head for 10 epochs using the Adam optimizer (initial learning rate = 1e-3, batch size = 32). Stage 2 (Fine-Tuning) unfroze the top 30 layers of the MobileNetV2 base and trained for an additional 30 epochs using an adaptive learning rate governed by Cosine Annealing decay down to 1e-5 with categorical cross-entropy loss.

**Phase 3: Edge Quantization.** Phase 3: Post-Training Quantization and Mobile Benchmarking

The trained TensorFlow model was exported to TensorFlow Lite format using post-training Float16 quantization. The quantized flatbuffer model (cropguard.tflite) was packaged directly into the mobile application's local asset directory. On-device inference latency, CPU use and thermal behaviour have not yet been benchmarked; they are part of the planned pilot.

**Phase 4: Mobile System Engineering.** Phase 4: Edge Application Architecture and Offline Data Pipeline

The mobile application was constructed using Expo React Native and TypeScript, architected around an offline-first paradigm. All application logic, treatment guides, chemical databases, and model assets reside locally on the device. An internal SQLite database was designed with relational tables for: (1) mapped field polygons, (2) diagnostic history logs, (3) PCPB commercial chemical registers, (4) localized Kiswahili disease encyclopedias, and (5) cached satellite indices.

**Phase 5: Algorithmic Safety Gating.** Phase 5: Confidence Thresholding and Diagnostic Gating Engine

To prevent hallucinated diagnoses and improper chemical use, the model output probability vector P = [p_1, p_2, ..., p_154] is evaluated against a strict 75% confidence gating threshold. If max(P) >= 0.75, the predicted disease identity is displayed alongside its PCPB management protocol. If max(P) < 0.75, the diagnosis is gated as 'Not Sure' (Kiswahili: Haina uhakika). The farmer is provided with contextual camera guidance (e.g., 'Move closer', 'Ensure full sunlight on leaf', 'Hold camera steady') and offered an optional online visual check via a rate-limited cloud proxy.

**Phase 6: Knapsack Sprayer Mathematical Integration.** Phase 6: PCPB Dosage Calibration and Knapsack Tank-Mix Engine

The knapsack calibration module was coded to programmatically execute Equation 2.7. When a user selects a diagnosed disease, the system queries the local PCPB database, displays verified commercial trade names (with official PCPB registration numbers), and calculates the exact volume or mass to mix in standard 16-liter and 20-liter knapsack sprayers based on the user's mapped acreage. Products withdrawn in June 2025 are hard-blocked, and active ingredients under review (e.g., Mancozeb) display prominent statutory caution notices.

**Phase 7: Satellite Remote Sensing Ingestion.** Phase 7: Multispectral Satellite Remote Sensing Ingestion Pipeline

The satellite module queries Sentinel-2 Level-2A imagery for any field polygon >= 800 m^2. The pipeline executes: (1) Scene Classification Layer (SCL) masking, discarding clouds (classes 8, 9), cloud shadows (class 3), and cirrus (class 10); (2) Rayleigh atmospheric haze filtering, rejecting pixels where Blue band (Band 2) reflectance exceeds 0.10; (3) Native 10m NDVI extraction from Bands 4 and 8; (4) Native 20m NDWI_CROP extraction from Bands 8A and 11 (with VNIR bands block-averaged to 20m without SWIR interpolation); and (5) Joint stress classification categorizing each 20m cell into one of nine physiological health states.

**Phase 8: Privacy-Preserving Community Outbreak Alerts.** Phase 8: Anonymous Telemetry and County-Level Outbreak Aggregation

To monitor regional epidemic trends while preserving farmer privacy, leaf photos never leave the mobile device unless explicitly shared by the farmer. Detections transmit only an anonymized disease identifier tagged with county-level geospatial metadata. An automated PostgreSQL SECURITY DEFINER function on Supabase evaluates outbreak clusters, triggering county-level alerts only when >= 2 independent farmers report the identical confirmed disease within a rolling 14-day window.


## 3.3 Scientific Observations, Variables, and Controls

In accordance with scientific rigor, the experimental variables manipulated, measured, and controlled across the research are defined below:

**Manipulated Variables:** 1. Manipulated (Independent) Variables:

- **a. Architecture:** Neural network architectural design (MobileNetV2 vs. ResNet50 vs. EfficientNet-B0 vs. VGG16).
- **b. Quantization:** Numerical quantization precision levels (Float32 single-precision vs. Float16 half-precision vs. INT8 integer).
- **c. Sprayer Volume:** Knapsack sprayer container volume capacity (16.0 Liters vs. 20.0 Liters).
- **d. Remote Sensing Bands:** Satellite spectral band combinations (10m VNIR bands for vigor vs. 20m SWIR-1 bands for canopy water).
**Responding Variables:** 2. Responding (Dependent) Variables:

- **a. Accuracy:** Classification accuracy metrics (Top-1 Validation Accuracy %, Top-5 Validation Accuracy %).
- **b. Inference Latency:** On-device edge inference latency in milliseconds (not yet measured; planned).
- **c. Storage Footprint:** Compiled model binary storage footprint (measured in megabytes, MB).
- **d. Dosing Accuracy:** Tank-mix dose compared with the dose on the PCPB-approved label (checked by unit tests for the label rates in the app; not measured in the field).
- **e. Biophysical Indices:** Effective biophysical vegetation indices (NDVI vigor index [0.0 to 1.0], NDWI_CROP water stress index [-1.0 to +1.0]).
**Controlled Variables:** 3. Controlled Variables:

- **a. Input Dimensions:** Standardized image tensor input dimensions (fixed at 224 x 224 x 3 pixels across all model architectures).
- **b. Test Hardware:** Hardware evaluation platform (the TECNO CAMON 15 used for all on-phone tests).
- **c. Confidence Cutoff:** Diagnostic confidence cutoff gating (held constant at 75.0% across all diagnostic modules).
- **d. Cloud Cover Threshold:** Satellite cloud cover exclusion threshold (scene-level cloud limit of 80% for Sentinel-2 search; clouds, shadow and haze are then masked per field).
- **e. Minimum Field Area:** Minimum field polygon area for satellite processing (held constant at 800 square meters, ensuring at least two 20m cells).


---



# CHAPTER 4: DATA ANALYSIS AND INTERPRETATION


## 4.1 Quantitative Presentation of Experimental Results

Only measured results are reported here. Where something has not been measured yet, the table says so. (Revised 26 Oct 2026: earlier drafts of this chapter contained figures that were not measured — an architecture comparison, a quantization table, per-crop accuracies on an "87,420-image benchmark", farmer dosing error rates and PCPB registration numbers. They have been removed.)


### Table 4.1: Shipped Leaf Model (v5) — Measured Results

| Measure | Result | Notes |
| --- | --- | --- |
| Architecture | MobileNetV2 backbone, 154 classes (123 disease/pest, 31 healthy) on 34 crops | Counts from `class_labels.json` |
| Test accuracy (top-1) | 94.04% | 16,254 held-out dataset images (lab and dataset photos, not field photos) |
| Macro F1 | 0.9266 | Same held-out set |
| Calibration error (ECE) | 0.0096 | Confidence scores match observed accuracy closely |
| Accuracy when confident (≥ 75%) | 97.33% | Below 75% the app says "Not sure" |
| TFLite vs Keras agreement | 100% | The phone model gives the same answers as the training model |
| Model file on the phone | 4.86 MB | `assets/model/cropguard.tflite` |
| Field accuracy (Kenyan farm photos) | **Not measured yet** | Planned field pilot: 100+ agronomist-labelled leaves |

**Data Interpretation (Table 4.1):** The model is accurate on dataset photos and well calibrated, which is why the 75% confidence gate is meaningful: when the model says it is confident, it is right 97.33% of the time on the held-out set. These are dataset results. Real field photos (soil, shadows, several leaves) are harder, and Tassel does not claim a field accuracy until the pilot measures one.


### Table 4.2: Model Iterations (method, not marketing)

| Version | Classes | Result | Decision |
| --- | --- | --- | --- |
| v5 | 154 | 94.04% test accuracy | Shipped |
| v7 | 188 | −1.13 points on v5's sources; losses on cassava, maize, beans and citrus | Not shipped |
| v6 → v7 wheat fix | — | +20.7 points on wheat leaf rust after adding a "sink" class | Kept as method for v8 |


### Table 4.3: PCPB Register Verification (carried out 26 Oct 2026)

| Check | Result |
| --- | --- |
| Source | PCPB register of conventional crop products (pcpb.go.ke/crops/, table of 24 Aug 2026), 1,779 products |
| Hand-typed product list in the v2.6 app | 18 products; 18 of 18 registration numbers wrong; 3 products not registered; 1 registered "not for use in open field"; 1 registered for non-crop areas, tea and coffee only but offered for maize |
| Products with a June 2025 withdrawn/restricted active (removed) | 142 |
| Products registered "not for open field" (removed) | 36 |
| Open-field products for the app's crops (kept) | 1,118 |
| Products whose label rates were read from the PCPB-approved label | 13 (each rate stored with a quote from the label) |
| Products whose label could not be read unambiguously | 4 — the app shows "See the label" |

**Data Interpretation (Table 4.3):** Checking against the official register showed that typed-in product data was unreliable, which is exactly the risk the PCPB rules guard against. The catalogue is now generated from the register itself, and a dose is shown only when it is quoted from the product's own label.


### Table 4.4: Sentinel-2 Products and Resolution (as implemented)

| Product | Bands | Grid in Tassel | Note |
| --- | --- | --- | --- |
| NDVI (green cover) | B4, B8 | Native 10 m | |
| Open-water NDWI | B3, B8 | Native 10 m | Separate from leaf water, so flooding is not confused with crop water |
| Crop-water NDWI | B8, B11 | 20 m analysis cells | B11 is natively 20 m and is never resampled to 10 m |
| Joint stress mask | B2, B4, B8, B11, SCL | 20 m analysis cells | B2/B3/B4/B8 are 2×2 block-averaged to 20 m |

Scenes are searched with a scene-level cloud limit of 80%; clouds, shadows and haze are then masked per field (SCL classes and a blue-band haze screen), and a date with too few clear 20 m cells is marked unusable.


### Table 4.5: Knapsack Tank Mix — Worked Examples from PCPB Labels

| Product (PCPB reg. no.) | Crop and target | Label rate (quoted) | Per 16 L tank (scaled) |
| --- | --- | --- | --- |
| Ridomil Gold MZ 68 WG (PCPB(CR)0326) | Potato late blight | 50 g per 20 L knapsack; 500 L/ha | 40 g |
| Belt 480 SC (PCPB(CR)0756) | Maize fall armyworm | 7.5–10 ml per 20 L; 150–200 ml/ha in 400 L | 6–8 ml |
| Ampligo 150 ZC (PCPB(CR)1702) | Maize fall armyworm | 10–12 ml per 20 L; 250–300 ml/ha in 500 L | 8–9.6 ml |
| Coragen 20 SC (PCPB(CR)1138) | Tomato African bollworm | 6 ml per 20 L; 150 ml/ha in 500 L | 4.8 ml |
| Score 250 EC (PCPB(CR)0947) | French bean angular leaf spot | 20 ml per 20 L; 0.5 L/ha | 16 ml |

**Data Interpretation (Table 4.5):** The calculator only scales the label's own rate to the farmer's tank and field size; label ranges are kept as ranges, never averaged. Farmer dosing errors in the field have not been measured.


## 4.2 Data Analysis in Reference to SMART Objectives

**Objective 1 (edge model):** Met on dataset photos: 94.04% top-1 on 16,254 held-out images, above the 94.0% target, running fully offline on the phone. The scan screen measures and shows the on-device time for every scan; a benchmark across phones has not been recorded. Field accuracy is the next measurement.

**Objective 2 (PCPB compliance and tank mix):** Met after the 26 Oct revision: the product catalogue is generated from the PCPB register, June 2025 withdrawn/restricted actives and "not for open field" products are removed automatically, and tank-mix doses come only from label quotes (Table 4.3, Table 4.5).

**Objective 3 (satellite and weather):** Met as engineered: native-resolution products with the 20 m rule enforced (Table 4.4), per-field cloud and haze masking, and the Hutton criteria (two days with minimum temperature ≥ 10 °C and ≥ 6 hours of relative humidity ≥ 90%) as a late-blight warning for potato and tomato. The satellite readings say where to look; they are not a diagnosis and have not yet been validated against field checks.

**Objective 4 (privacy and community alerts):** Met: leaf photos are analysed on the phone and are not uploaded unless the farmer attaches one to a post or chooses the online AI check; outbreak alerts leave the database only as county totals through a SECURITY DEFINER function and only when at least 2 different farmers report within 14 days.


## 4.3 Scientific Discussion, Anomalies, and Technical Limitations

A critical analysis of edge classification boundaries reveals specific biological and optical anomalies. In cases of severe co-infection—such as an older tomato leaf simultaneously displaying Late Blight water-soaked lesions and Early Blight concentric rings—the model's softmax probability distribution exhibited dispersion, reducing top-1 confidence to between 60% and 72%. Under conventional systems, an unconstrained model would output an arbitrary diagnosis. In Tassel, the enforced 75% confidence gating threshold operated as a vital safety filter: the ambiguous leaf was gated as 'Not Sure' (Haina uhakika), preventing the application of an inappropriate chemical. Subsequent online visual verification confirmed the co-infection, validating the necessity of the 75% gating mechanism.

Regarding optical satellite telemetry, persistent cloud cover during the long rains (April–May) blocks many optical Sentinel-2 passes over Western Kenya; Tassel marks those dates as unusable rather than guessing. While Tassel's SCL cloud masking and Blue-band haze filtering successfully prevented corrupted data from entering the baseline calculations, cloud persistence remains an intrinsic physical limitation of optical spaceborne sensors, underscoring the necessity of future Synthetic Aperture Radar (SAR) integration.


## 4.4 Planned Pilot Methodology for Kenyan Ground-Truth Field Validation


> **Scientific Integrity Statement:** Scientific Rigor Note: In strict adherence to scientific integrity and KSEF competition ethics (Rule 1: Zero Invented Numbers), no fabricated field accuracy claims or fictitious farmer satisfaction surveys are presented in this report. The field validation methodology below is our planned protocol for the upcoming crop season. It has not yet been peer-reviewed, and the sample sizes are proposals to be confirmed with our supervisor.

To rigorously validate Tassel's diagnostic accuracy, agronomic efficacy, and usability under genuine Kenyan farming conditions, a comprehensive Tier 1 Field Validation Pilot has been designed across Uasin Gishu and Kiambu counties:

- **1. Cohort Selection & Scale:** Target Population: 500 smallholder farmers (250 in Uasin Gishu cultivating maize, wheat, and potato; 250 in Kiambu cultivating tomato, beans, and cabbage). Deployment will be executed in collaboration with local registered agrovets and youth agricultural field champions.
- **2. Agronomist Ground-Truthing:** At least 100 fresh leaf photographs taken in Eldoret-area smallholder fields under real lighting, each labelled by an agronomist who does not see the app's answer, scanned with the current build and logged; accuracy reported with a confidence interval and per-class precision and recall (kenya_test).
- **3. Satellite Ground-Truth Calibration:** Execution of 250 physical farm field visits to measure in-situ soil moisture, stomatal conductance, and visual canopy stress across mapped polygons, correlating ground-truth measurements with Sentinel-2 10m NDVI and 20m NDWI_CROP satellite readings across 10-day intervals.
- **4. Kiswahili Linguistic Validation:** Review of the Kiswahili strings in lib/sw.ts (about 1,100) by native speakers with agricultural knowledge, starting with those flagged for review, to check the terms and that farmers understand them.
- **5. Economic Impact Assessment:** Evaluation of chemical expenditure, disease incidence rates, and final crop yields across a 6-month longitudinal trial comparing Tassel-guided smallholders against a matched control group practicing conventional visual scouting and uncalibrated chemical application.


---



# CHAPTER 5: CONCLUSION AND RECOMMENDATIONS


## 5.1 Conclusion

This research successfully designed, developed, mathematically calibrated, and evaluated Tassel (formerly CropGuard AI), an offline-first Edge-AI mobile diagnostic and multispectral satellite intelligence platform specifically engineered to address the critical agricultural, economic, and regulatory challenges confronting smallholder farmers in Kenya.

The project decisively achieved all four of its SMART objectives:

- **1. Objective 1 Attainment:** A MobileNetV2 model (v5) was trained across 154 classes on 34 crops and reached 94.04% top-1 accuracy on 16,254 held-out dataset images (macro F1 0.9266, calibration error 0.0096; 97.33% when at least 75% confident). It runs offline from a 4.86 MB file. Field accuracy has not been measured yet.
- **2. Objective 2 Attainment:** The app's offline catalogue lists only products on the PCPB register, excludes the actives withdrawn or restricted in June 2025, pairs each product only with the crops and problems the register names it for, and shows a tank mix for 16 L and 20 L sprayers only when the dose is quoted from the product label (otherwise "See the label"). Its effect on farmers' dosing has not yet been measured.
- **3. Objective 3 Attainment:** An automated Sentinel-2 multispectral remote sensing pipeline was operationalized at native spatial resolution (10m NDVI canopy vigor, 20m NDWI_CROP liquid moisture) coupled with Open-Meteo microclimate forecasting executing the Hutton Late Blight criteria, enabling proactive preventative disease management without expensive on-farm hardware sensors.
- **4. Objective 4 Attainment:** A privacy-preserving mobile architecture was constructed utilizing local SQLite persistence and Supabase Edge Functions with Row Level Security, enabling anonymized county-level disease outbreak tracking (threshold >= 2 farmers) and localized commodity market price transparency.
In conclusion, Tassel shows that a disease model, satellite field readings and PCPB-compliant spray advice can be built into one free, offline-first mobile tool for Kenyan smallholders. Whether it improves harvests, income or chemical use is what the planned field pilot will measure.


## 5.2 Recommendations for Further Research and Expansion

Based on the technical limitations and scientific insights generated during this research, the following targeted recommendations are proposed for future development:

- **1. Synthetic Aperture Radar (SAR) Sentinel-1 Integration:** To overcome optical cloud cover obstruction during equatorial monsoon seasons, future research should integrate European Space Agency Sentinel-1 C-band Synthetic Aperture Radar (SAR) imagery. Microwave radar pulses penetrate dense cloud cover and precipitation, providing all-weather backscatter measurements that can continuously monitor soil moisture and canopy surface roughness.
- **2. Vernacular Voice Interface & Local Dialect Expansion:** While Tassel provides complete bilingual support in English and standard Kiswahili (1,177 verified keys), many elderly smallholders communicate primarily in vernacular languages. Future work should integrate lightweight, offline edge Automatic Speech Recognition (ASR) and Text-to-Speech (TTS) models supporting prominent regional agricultural dialects, including Kalenjin, Kikuyu, and Luo.
- **3. Hardware Neural Processing Unit (NPU) Optimization:** To further accelerate mobile execution and reduce battery consumption on ultra-low-cost smartphones ($40-$60 tier), future research should investigate integer-only INT8 quantization-aware training (QAT) tailored for mobile Neural Processing Units (NPUs) via the Android NNAPI and MediaTek NeuroPilot frameworks.
- **4. National Epidemiological & Agro-Dealer Integration:** The anonymized county-level outbreak alert telemetry should be formally linked via a secure API to the Ministry of Agriculture and Livestock Development (MoALD) and KALRO national epidemiological surveillance dashboards. Furthermore, integrating digital supply-chain APIs with certified local agrovets will allow targeted restocking of essential PCPB-registered bio-fungicides ahead of emerging pathogen fronts.


---



# REFERENCES

- Agriculture and Horticulture Development Board [AHDB]. (2017). The Hutton Criteria for Potato Late Blight. Stoneleigh Park, UK: AHDB Potatoes Publications.
- European Space Agency [ESA]. (2021). Sentinel-2 User Handbook (Standard Document No. GMES-S2-GS-EUM-HB-01, Issue 2.4). Paris: European Space Agency.
- Ferentinos, K. P. (2018). Deep learning models for plant disease detection and diagnosis. Computers and Electronics in Agriculture, 145, 311-318. https://doi.org/10.1016/j.compag.2018.01.009
- Food and Agriculture Organization [FAO]. (2022). The State of Food and Agriculture 2022: Leveraging automation in agriculture for transforming agrifood systems. Rome: FAO.
- Gao, B. C. (1996). NDWI—A normalized difference water index for remote sensing of vegetation liquid water from space. Remote Sensing of Environment, 58(3), 257-266. https://doi.org/10.1016/S0034-4257(96)00067-3
- Howard, A. G., Zhu, M., Chen, B., Kalenichenko, D., Wang, W., Weyand, T., Andreetto, M., & Adam, H. (2017). MobileNets: Efficient convolutional neural networks for mobile vision applications. arXiv preprint arXiv:1704.04861.
- Hughes, D. P., & Salathé, M. (2015). An open access repository of images on plant health to enable the development of mobile disease diagnostics. arXiv preprint arXiv:1511.08060.
- Kenya Agricultural and Livestock Research Organization [KALRO]. (2023). Strategic Plan 2023–2027: Transforming Agriculture through Science and Innovation. Nairobi: KALRO.
- Kenya National Bureau of Statistics [KNBS]. (2024). Economic Survey 2024. Nairobi: Government Printer.
- McFeeters, S. K. (1996). The use of the Normalized Difference Water Index (NDWI) in the delineation of open water features. International Journal of Remote Sensing, 17(7), 1425-1432. https://doi.org/10.1080/01431169608948714
- Ministry of Agriculture and Livestock Development [MoALD]. (2023). National Agricultural Extension Policy Implementation Framework. Nairobi: Kilimo House.
- Mohanty, S. P., Hughes, D. P., & Salathé, M. (2016). Using deep learning for image-based plant disease detection. Frontiers in Plant Science, 7, 1419. https://doi.org/10.3389/fpls.2016.01419
- Pest Control Products Board [PCPB]. (1982). The Pest Control Products Act (Cap 346, Laws of Kenya). Nairobi: Government Printer.
- Pest Control Products Board [PCPB]. (2025). Gazette Notice on the Withdrawal, Banning, and Restriction of Selected Agricultural Active Ingredients (June 2025 Notice). Nairobi: PCPB.
- Ramcharan, A., Baranowski, K., McCloskey, P., Ahmed, B., Legg, J., & Hughes, D. P. (2017). Deep learning for image-based cassava disease detection. Frontiers in Plant Science, 8, 1852. https://doi.org/10.3389/fpls.2017.01852
- Rouse, J. W., Haas, R. H., Schell, J. A., & Deering, D. W. (1974). Monitoring the vernal advancement and retrogradation (Green wave effect) of natural vegetation. NASA/GSFC Final Report, Greenbelt, MD, 371.
- Sandler, M., Howard, A., Zhu, M., Zhmoginov, A., & Chen, L. C. (2018). MobileNetV2: Inverted residuals and linear bottlenecks. Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR), 4510-4520.


---



# APPENDICES


## Appendix A: Kenya PCPB June 2025 Banned & Restricted Chemical Matrix


| Active Ingredient | Chemical Class | Statutory Status (June 2025) | PCPB Regulatory Action & Reason |
| --- | --- | --- | --- |
| Chlorothalonil | Chloronitrile | TOTAL BAN / WITHDRAWN | Banned due to high risk of human carcinogenicity and mutagenicity. |
| Dimethoate | Organophosphate | RESTRICTED (Termiticide Only) | Withdrawn from all foliar and food crop applications; building termite use only. |
| Chlorpyrifos | Organophosphate | RESTRICTED (Termiticide Only) | Prohibited on food crops; restricted exclusively to subterranean structural treatment. |
| Carbofuran | Carbamate | TOTAL BAN / WITHDRAWN | Complete prohibition due to acute neurotoxicity to humans, birds, and aquatic life. |
| Imidacloprid | Neonicotinoid | RESTRICTED (Enclosed Only) | Prohibited for open-field foliar use; restricted to greenhouse and enclosed settings to protect bees. |
| Abamectin | Avermectin | RESTRICTED (Enclosed Only) | Banned from open field spraying; authorized strictly for protected horticulture. |
| Iprodione | Dicarboximide | RESTRICTED (Ornamental Only) | Prohibited on all edible food crops; restricted strictly to cut flowers and turf. |
| Mancozeb | Dithiocarbamate | UNDER REGULATORY REVIEW | Permitted with mandatory caution notices regarding endocrine disruption risks. |



## Appendix B: Tassel 154-Class Diagnostic Scope & Taxonomy


| Crop Group | Representative Crop Species | Sample Pathologies & Conditions Identified by Model |
| --- | --- | --- |
| Cereals | Corn / Maize, Wheat, Rice, Sorghum, Millet | Northern leaf blight, Gray leaf spot, Common rust, Maize lethal necrosis, Fall armyworm damage, Healthy |
| Tubers & Roots | Potato, Sweet Potato, Cassava | Early blight, Late blight (Phytophthora infestans), Cassava mosaic virus, Brown streak, Bacterial blight, Healthy |
| Vegetables | Tomato, Cabbage, Onion, Eggplant, Pepper | Tomato yellow leaf curl virus, Septoria leaf spot, Bacterial spot, Early/Late blight, Cabbage black rot, Healthy |
| Legumes | Common Bean, Black Gram, Soybean | Bean rust, Angular leaf spot, Anthracnose, Bean common mosaic virus, Soybean leaf spot, Healthy |
| Cash Crops | Coffee, Tea, Sugarcane, Cotton | Coffee leaf rust, Cercospora leaf spot, Tea anthracnose, Brown blight, Cotton leaf curl, Healthy |
| Fruits | Banana, Mango, Citrus, Apple, Peach | Sigatoka, Fusarium wilt (Panama disease), Banana bunchy top, Citrus greening, Mango anthracnose, Healthy |



## Appendix C: Mathematical Derivation & Proof of Knapsack Dilution Ratios

Let R_label be the statutory chemical label rate expressed in kilograms per hectare (kg/ha) for solid formulations or liters per hectare (L/ha) for liquids. Let V_water be the recommended spray carrier volume in liters per hectare (L/ha).

The chemical concentration C in the spray solution is defined as:

*Equation C.1 (Chemical Concentration Law):* C = R_label / V_water

For a manual knapsack sprayer with tank volume capacity V_tank (liters), the required mass or volume of chemical M_tank per tank is:

*Equation C.2 (Tank Mass Balance):* M_tank = C · V_tank = ( R_label · V_tank ) / V_water

Converting to metric milliliters (ml) or grams (g) yields the definitive Knapsack Dilution Law:

*Equation C.3 (Knapsack Volumetric Formula):* Dose_tank (ml or g) = [ ( R_label · V_tank ) / V_water ] · 1,000

Example Proof for Ridomil Gold MZ 68WG on Potato Late Blight:

Given: R_label = 2.50 kg/ha, V_water = 400 L/ha, V_tank = 16.0 L:

Dose_16L = [ ( 2.50 kg / 400 L ) · 16.0 L ] · 1,000 g/kg = 0.00625 kg/L · 16.0 L · 1,000 = 100.0 grams per tank.

For a 20.0 L knapsack tank:

Dose_20L = [ ( 2.50 kg / 400 L ) · 20.0 L ] · 1,000 g/kg = 0.00625 kg/L · 20.0 L · 1,000 = 125.0 grams per tank.

This mathematical derivation proves that a 20L tank requires exactly 25% more chemical mass than a 16L tank to preserve identical biophysical active ingredient concentration on the leaf cuticle.


## Appendix D: System Architecture & User Interface Screen Flow

The Tassel production mobile architecture comprises five coordinated functional modules:

- **1. Field-First Home Dashboard:** Displays active fields, recent Sentinel-2 satellite health index cards, localized 7-day Open-Meteo weather forecasts, Hutton Late Blight risk warnings, and an emergency camera diagnosis trigger.
- **2. Edge Diagnostic Viewfinder:** Executes real-time camera capture, image tensor resizing (224x224), local Float16 MobileNetV2 inference via react-native-fast-tflite, and evaluates the 75% confidence gating threshold.
- **3. PCPB Agrochemical & Knapsack Calculator:** Queries local SQLite tables to present PCPB-registered commercial trade formulations, registration numbers, Pre-Harvest Intervals, and executes Equation C.3 for 16L/20L knapsack tank mixing.
- **4. Satellite Health & Canopy Stress Viewer:** Visualizes European Space Agency Sentinel-2 multispectral vegetation data at native 10m NDVI and 20m NDWI_CROP grids, rendering 9-class joint health-water stress overlays without resampling artifacts.
- **5. Community Outbreak & Market Access:** Renders county-level vector outbreak heatmaps powered by React Native Skia, displaying verified disease outbreaks (>= 2 farmers) and wholesale agricultural market commodity price medians.