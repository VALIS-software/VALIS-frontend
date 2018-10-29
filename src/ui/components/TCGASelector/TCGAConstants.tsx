const CANCER_NAMES =[
    ["Breast invasive carcinoma", "BRCA"],
    ["Ovarian serous cystadenocarcinoma", "OV"],
    ["Uterine Corpus Endometrial Carcinoma", "UCEC"],
    ["Kidney renal clear cell carcinoma", "KIRC"],
    ["Glioblastoma multiforme", "GBM"],
    ["Head and Neck squamous cell carcinoma", "HNSC"],
    ["Lung adenocarcinoma", "LUAD"],
    ["Brain Lower Grade Glioma", "LGG"],
    ["Thyroid carcinoma", "THCA"],
    ["Lung squamous cell carcinoma", "LUSC"],
    ["Prostate adenocarcinoma", "PRAD"],
    ["Skin Cutaneous Melanoma", "SKCM"],
    ["Colon adenocarcinoma", "COAD"],
    ["Stomach adenocarcinoma", "STAD"],
    ["Bladder Urothelial Carcinoma", "BLCA"],
    ["Liver hepatocellular carcinoma", "LIHC"],
    ["Cervical squamous cell carcinoma and endocervical adenocarcinoma", "CESC"],
    ["Kidney renal papillary cell carcinoma", "KIRP"],
    ["Sarcoma", "SARC"],
    ["Acute Myeloid Leukemia", "LAML"],
    ["Esophageal carcinoma", "ESCA"],
    ["Pancreatic adenocarcinoma", "PAAD"],
    ["Pheochromocytoma and Paraganglioma", "PCPG"],
    ["Rectum adenocarcinoma", "READ"],
    ["Testicular Germ Cell Tumors", "TGCT"],
    ["Thymoma", "THYM"],
    ["Mesothelioma", "MESO"],
    ["Adrenocortical carcinoma", "ACC"],
    ["Uveal Melanoma", "UVM"],
    ["Kidney Chromophobe", "KICH"],
    ["Uterine Carcinosarcoma", "UCS"],
    ["Lymphoid Neoplasm Diffuse Large B-cell Lymphoma", "DLBC"],
    ["FFPE Pilot Phase II", "FPPP"],
    ["Cholangiocarcinoma", "CHO"],
];

const CANCER_NAME_MAP : any = {};
const VITAL_STATUS_MAP : any = {};
const GENDER_NAME_MAP : any = {};

CANCER_NAMES.forEach((pair: string[]) => {
    CANCER_NAME_MAP[pair[1]] = pair[0];
})

const VITAL_STATUS_NAMES = [
    ["Alive", 'Alive'],
    ["Deceased", 'Dead'],
];

VITAL_STATUS_NAMES.forEach((pair: string[]) => {
    VITAL_STATUS_MAP[pair[1]] = pair[0];
})

const GENDER_NAMES = [
    ["Male", 'MALE'],
    ["Female", 'FEMALE'],
];

GENDER_NAMES.forEach((pair: string[]) => {
    GENDER_NAME_MAP[pair[1]] = pair[0];
})


const MIN_AGE = 0;
const MAX_AGE = 110;

export {
    CANCER_NAMES,
    CANCER_NAME_MAP,
    VITAL_STATUS_MAP,
    GENDER_NAME_MAP,
    GENDER_NAMES,
    VITAL_STATUS_NAMES,
    MIN_AGE,
    MAX_AGE
}