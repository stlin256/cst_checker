document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('nameInput');
    const searchButton = document.getElementById('searchButton');
    const resultDiv = document.getElementById('result');
    let interviewData = new Map();
    let messageTemplates = {};

    const getKey = async () => {
        try {
            const response = await fetch('secret.key');
            if (!response.ok) throw new Error('无法加载密钥文件');
            const key = await response.text();
            return key.trim();
        } catch (error) {
            console.error('获取密钥失败:', error);
            return null;
        }
    };

    const decryptData = (encryptedData, key) => {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, key);
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (e) {
            console.error("AES解密失败:", encryptedData, e);
            return null;
        }
    };

    const loadAndProcessData = async () => {
        const key = await getKey();
        if (!key) {
            displayResult('<h3>加载失败</h3><p>无法获取加密密钥，请联系管理员。</p>', 'fail');
            return;
        }

        try {
            const [dataResponse, messagesResponse] = await Promise.all([
                fetch('data.dat'),
                fetch('data2.dat')
            ]);

            if (!dataResponse.ok) throw new Error('网络错误，无法加载 data.dat');
            if (!messagesResponse.ok) throw new Error('网络错误，无法加载 data2.dat');

            // Process data.dat
            const dataText = await dataResponse.text();
            const lines = dataText.trim().split('\n');
            for (const line of lines) {
                if (!line) continue;
                const decodedString = decryptData(line, key);
                if (!decodedString) continue;
                const parts = decodedString.split(':');
                if (parts.length === 2) {
                    const [name, resultCode] = parts;
                    interviewData.set(name, resultCode);
                }
            }

            // Process data2.dat
            const messagesText = await messagesResponse.text();
            const decryptedMessages = decryptData(messagesText, key);
            if (decryptedMessages) {
                messageTemplates = JSON.parse(decryptedMessages);
            } else {
                throw new Error('无法解密提示信息文件');
            }

        } catch (error) {
            console.error('加载或解析数据文件时出错:', error);
            displayResult('<h3>加载失败</h3><p>无法加载数据，请联系管理员。</p>', 'fail');
        }
    };

    loadAndProcessData();

    const displayResult = (message, type) => {
        resultDiv.innerHTML = message;
        resultDiv.className = 'result-box'; 
        resultDiv.classList.add(type);
        resultDiv.classList.add('visible');
    };
    
    const performSearch = () => {
        const nameToSearch = nameInput.value.trim();
        
        if (!nameToSearch) {
            displayResult('<h3>提示</h3><p>请输入一个姓名进行查询。</p>', 'not-found');
            return;
        }

        const resultCode = interviewData.get(nameToSearch);

        if (resultCode) {
            let message = messageTemplates[resultCode] || messageTemplates['NotFound'];
            let resultType = 'not-found';

            if (resultCode === 'P') resultType = 'pass';
            if (resultCode === 'F') resultType = 'fail';
            
            message = message.replace(/\$\{nameToSearch\}/g, nameToSearch);
            displayResult(message, resultType);
        } else {
            let message = messageTemplates['NotFound'].replace(/\$\{nameToSearch\}/g, nameToSearch);
            displayResult(message, 'not-found');
        }
    };

    searchButton.addEventListener('click', performSearch);
    nameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') performSearch();
    });
    nameInput.addEventListener('input', () => {
        if (resultDiv.classList.contains('visible')) {
            resultDiv.classList.remove('visible');
        }
    });
});