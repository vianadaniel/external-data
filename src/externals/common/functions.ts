export function getUfCpfSer(cpf): string {
  cpf = cpf.replace(/\D/g, '');

  if (cpf.length !== 11) {
    return 'CPF inválido';
  }

  if (/^(\d)\1{10}$/.test(cpf)) {
    return 'CPF inválido';
  }

  const penultimoDigito = cpf[8];

  const estados = {
    '0': 'RS',
    '1': 'DF',
    '2': 'PA',
    '3': 'CE',
    '4': 'PE',
    '5': 'BA',
    '6': 'MG',
    '7': 'RJ',
    '8': 'SP',
    '9': 'PR',
  };

  return estados[penultimoDigito];
}

export function removeMask(string?: string): string {
  if (!string) return '';
  return string.replace(/[^A-Z0-9]/g, '');
}


