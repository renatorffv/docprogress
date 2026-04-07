import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">
          Documentador Progress 4GL
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Faca upload de seus programas Progress 4GL (.p, .w, .i) e gere
          documentacao tecnica completa automaticamente usando inteligencia
          artificial.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-blue-600 text-2xl font-bold">1</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">Upload</h3>
          <p className="text-gray-600 text-sm">
            Envie seus arquivos .p, .w, .i ou um projeto inteiro de uma vez.
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-green-600 text-2xl font-bold">2</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">Analise com IA</h3>
          <p className="text-gray-600 text-sm">
            A IA analisa o codigo, identifica procedures, funcoes, tabelas e
            dependencias.
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-purple-600 text-2xl font-bold">3</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">Documentacao</h3>
          <p className="text-gray-600 text-sm">
            Receba documentacao tecnica completa em Markdown, pronta para usar.
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Link
          href="/upload"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Enviar Arquivos
        </Link>
        <Link
          href="/projects"
          className="px-6 py-3 bg-white text-gray-700 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition"
        >
          Ver Projetos
        </Link>
      </div>
    </div>
  );
}
