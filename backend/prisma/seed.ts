import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const clinica = await prisma.clinica.upsert({
    where: { cnpj: "00.000.000/0001-00" },
    update: {},
    create: {
      nome: "CliniCão Veterinária",
      cnpj: "00.000.000/0001-00",
      telefone: "(11) 99999-9999",
      email: "contato@clinicao.com",
      endereco: "Rua dos Animais, 123 - São Paulo/SP",
    },
  });

  const senhaAdmin = await bcrypt.hash("admin123", 10);
  await prisma.usuario.upsert({
    where: { email: "admin@clinicao.com" },
    update: {},
    create: {
      nome: "Administrador",
      email: "admin@clinicao.com",
      senha: senhaAdmin,
      role: "SUPER_ADMIN",
      clinicaId: clinica.id,
    },
  });

  const senhaVet = await bcrypt.hash("vet123", 10);
  await prisma.usuario.upsert({
    where: { email: "vet@clinicao.com" },
    update: {},
    create: {
      nome: "Dr. Lucas Ferreira",
      email: "vet@clinicao.com",
      senha: senhaVet,
      role: "VETERINARIO",
      clinicaId: clinica.id,
    },
  });

  const senhaRec = await bcrypt.hash("rec123", 10);
  await prisma.usuario.upsert({
    where: { email: "recepcao@clinicao.com" },
    update: {},
    create: {
      nome: "Ana Recepcionista",
      email: "recepcao@clinicao.com",
      senha: senhaRec,
      role: "RECEPCIONISTA",
      clinicaId: clinica.id,
    },
  });

  const senhaBio = await bcrypt.hash("bio123", 10);
  await prisma.usuario.upsert({
    where: { email: "bio@clinicao.com" },
    update: {},
    create: {
      nome: "Carlos Bioquímico",
      email: "bio@clinicao.com",
      senha: senhaBio,
      role: "BIOQUIMICO",
      clinicaId: clinica.id,
    },
  });

  const medicamentos = [
    {
      nome: "Tramadol",
      principioAtivo: "Cloridrato de Tramadol",
      categoria: "Analgésico",
      descricao: "Analgésico opioide para dor moderada a severa",
      unidade: "mg",
      variantes: [
        { concentracao: "50mg", apresentacao: "Comprimido" },
        { concentracao: "100mg", apresentacao: "Comprimido" },
        { concentracao: "50mg/ml", apresentacao: "Injetável" },
      ],
    },
    {
      nome: "Amoxicilina",
      principioAtivo: "Amoxicilina Triidratada",
      categoria: "Antibiótico",
      descricao: "Antibiótico de amplo espectro",
      unidade: "mg",
      variantes: [
        { concentracao: "250mg", apresentacao: "Comprimido" },
        { concentracao: "500mg", apresentacao: "Comprimido" },
        { concentracao: "50mg/ml", apresentacao: "Suspensão oral" },
      ],
    },
    {
      nome: "Meloxicam",
      principioAtivo: "Meloxicam",
      categoria: "Anti-inflamatório",
      descricao: "Anti-inflamatório não esteroidal",
      unidade: "mg",
      variantes: [
        { concentracao: "2mg", apresentacao: "Comprimido" },
        { concentracao: "0,5mg/ml", apresentacao: "Suspensão oral" },
        { concentracao: "5mg/ml", apresentacao: "Injetável" },
      ],
    },
    {
      nome: "Dipirona",
      principioAtivo: "Metamizol Sódico",
      categoria: "Analgésico",
      descricao: "Analgésico e antitérmico",
      unidade: "mg",
      variantes: [
        { concentracao: "500mg", apresentacao: "Comprimido" },
        { concentracao: "500mg/ml", apresentacao: "Injetável" },
      ],
    },
    {
      nome: "Dexametasona",
      principioAtivo: "Dexametasona",
      categoria: "Corticosteroide",
      descricao: "Corticosteroide anti-inflamatório e imunossupressor",
      unidade: "mg",
      variantes: [
        { concentracao: "0,1mg", apresentacao: "Comprimido" },
        { concentracao: "4mg/ml", apresentacao: "Injetável" },
      ],
    },
    {
      nome: "Ivermectina",
      principioAtivo: "Ivermectina",
      categoria: "Antiparasitário",
      descricao: "Antiparasitário de amplo espectro",
      unidade: "mg",
      variantes: [
        { concentracao: "6mg", apresentacao: "Comprimido" },
        { concentracao: "1%", apresentacao: "Solução injetável" },
      ],
    },
    {
      nome: "Cefalexina",
      principioAtivo: "Cefalexina",
      categoria: "Antibiótico",
      descricao: "Antibiótico cefalosporina de primeira geração",
      unidade: "mg",
      variantes: [
        { concentracao: "250mg", apresentacao: "Comprimido" },
        { concentracao: "500mg", apresentacao: "Comprimido" },
      ],
    },
    {
      nome: "Furosemida",
      principioAtivo: "Furosemida",
      categoria: "Diurético",
      descricao: "Diurético de alça",
      unidade: "mg",
      variantes: [
        { concentracao: "40mg", apresentacao: "Comprimido" },
        { concentracao: "10mg/ml", apresentacao: "Injetável" },
      ],
    },
  ];

  for (const med of medicamentos) {
    await prisma.medicamento.upsert({
      where: { id: med.nome },
      update: {},
      create: {
        id: med.nome,
        nome: med.nome,
        principioAtivo: med.principioAtivo,
        categoria: med.categoria,
        descricao: med.descricao,
        unidade: med.unidade,
        variantes: {
          create: med.variantes,
        },
      },
    });
  }

  const tramadol = await prisma.medicamento.findFirst({ where: { nome: "Tramadol" } });
  const dipirona = await prisma.medicamento.findFirst({ where: { nome: "Dipirona" } });
  const dexametasona = await prisma.medicamento.findFirst({ where: { nome: "Dexametasona" } });
  const meloxicam = await prisma.medicamento.findFirst({ where: { nome: "Meloxicam" } });
  const furosemida = await prisma.medicamento.findFirst({ where: { nome: "Furosemida" } });

  async function ensureInteracao(
    aId: string,
    bId: string,
    data: { tipo: string; severidade: string; descricao: string },
  ) {
    const exists = await prisma.interacaoMedicamentosa.findFirst({
      where: {
        OR: [
          { medicamentoAId: aId, medicamentoBId: bId },
          { medicamentoAId: bId, medicamentoBId: aId },
        ],
      },
    });
    if (!exists) {
      await prisma.interacaoMedicamentosa.create({
        data: { medicamentoAId: aId, medicamentoBId: bId, ...data },
      });
    }
  }

  if (tramadol && dipirona) {
    await ensureInteracao(tramadol.id, dipirona.id, {
      tipo: "POTENCIALIZACAO",
      severidade: "MODERADA",
      descricao:
        "O uso combinado pode potencializar o efeito analgésico, mas aumenta risco de hipotensão.",
    });
  }

  if (dexametasona && meloxicam) {
    await ensureInteracao(dexametasona.id, meloxicam.id, {
      tipo: "CONTRAINDICADO",
      severidade: "GRAVE",
      descricao:
        "Combinação de corticosteroide com AINE aumenta risco de úlcera gastrointestinal.",
    });
  }

  if (furosemida && meloxicam) {
    await ensureInteracao(furosemida.id, meloxicam.id, {
      tipo: "REDUCAO",
      severidade: "MODERADA",
      descricao: "AINEs podem reduzir o efeito diurético da furosemida.",
    });
  }

  console.log("✅ Banco populado com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });