const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const dbPath = './db/pessoas.db'; // Alterado para pessoas.db

// Função para carregar o banco de dados
function loadParticipants() {
    if (fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath, 'utf8');
        if (data.trim()) {
            return JSON.parse(data);
        }
    }
    return [];
}

// Função para salvar o banco de dados
function saveParticipants(participants) {
    fs.writeFileSync(dbPath, JSON.stringify(participants, null, 2), 'utf8');
}

// Rota para obter a lista de participantes
app.get('/get-participants', (req, res) => {
    const participants = loadParticipants();
    
    if (participants.length > 0) {
        res.json({ success: true, participants });
    } else {
        res.json({ success: false, message: 'Nenhum participante encontrado.' });
    }
});

// Rota para verificar o participante
app.post('/check-participant', (req, res) => {
    const { name } = req.body;
    const participants = loadParticipants();

    // Verificar se o participante está na lista
    const participant = participants.find(p => p.name.toLowerCase() === name.toLowerCase());

    if (!participant) {
        return res.json({ success: false, message: 'Nome não encontrado na lista de participantes.' });
    }

    // Se o sorteio já foi realizado, retorna o resultado
    if (participant.drawn) {
        return res.json({ success: true, name: participant.name, drawn: participant.drawn });
    }

    // Verifica se o nome é válido e habilita o botão de sorteio
    return res.json({ success: true, name: participant.name });
});

// Rota para realizar o sorteio
app.post('/draw', (req, res) => {
    const { name } = req.body;
    let participants = loadParticipants();

    // Verificar se o participante está na lista
    const participant = participants.find(p => p.name.toLowerCase() === name.toLowerCase());

    if (!participant) {
        return res.json({ success: false, message: 'Participante não encontrado.' });
    }

    // Verificar se o sorteio já foi realizado
    if (participant.drawn) {
        return res.json({ success: true, name: participant.name, drawn: participant.drawn });
    }

    // Filtrar os participantes disponíveis (sem sorteio realizado e que não sejam o próprio participante)
    let availableParticipants = participants.filter(p => p.name !== participant.name && !p.drawnBy);

    // Se não houver mais participantes disponíveis
    if (availableParticipants.length === 0) {
        return res.json({ success: false, message: 'Não há mais participantes disponíveis para sortear.' });
    }

    // Sortear um participante aleatório entre os disponíveis
    const drawn = availableParticipants[Math.floor(Math.random() * availableParticipants.length)];
    
    // Atualizar quem o participante tirou
    participant.drawn = drawn.name;
    drawn.drawnBy = participant.name; // Marcar que o sorteado foi tirado por alguém

    // Atualizar os participantes no array
    participants = participants.map(p => {
        if (p.name === participant.name) return participant;
        if (p.name === drawn.name) return drawn;
        return p;
    });

    // Salvar a lista atualizada no banco de dados
    saveParticipants(participants);

    // Retorna o nome sorteado
    res.json({ success: true, name: participant.name, drawn: drawn.name });
});

// Inicializa o servidor
app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});
