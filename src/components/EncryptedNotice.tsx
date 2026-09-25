function EncryptedNotice() {
  return (
    <div className="m-4 p-4 rounded-lg bg-zinc-800 text-zinc-300 text-sm leading-6">
      <div className="font-bold mb-1">🔒 Módulo cifrado</div>
      Este módulo está protegido con el cifrado propio de e-Sword, así que su contenido
      solo puede leerse dentro de e-Sword. Los módulos sin cifrar sí se abren normalmente.
    </div>
  );
}

export default EncryptedNotice;
