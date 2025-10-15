document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('nameInput');
    const searchButton = document.getElementById('searchButton');
    const resultDiv1 = document.getElementById('result1');
    const resultDiv2 = document.getElementById('result2');

    let interviewData1 = new Map();
    let messageTemplates1 = {};
    let interviewData2 = new Map();
    let messageTemplates2 = {};

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
            console.error("解密失败:", encryptedData, e);
            return null;
        }
    };

    const loadAndProcessData = async () => {
        const key = await getKey();
        if (!key) {
            displayResult('result1', '<h3>加载失败</h3><p>请联系管理员。</p>', 'fail');
            return;
        }

        try {
            const [res1, res2, res3, res4] = await Promise.all([
                fetch('data.dat').catch(e => e),
                fetch('data2.dat').catch(e => e),
                fetch('data3.dat').catch(e => e),
                fetch('data4.dat').catch(e => e)
            ]);

            // Process round 1 data
            if (res1.ok && res2.ok) {
                const dataText1 = await res1.text();
                const lines1 = dataText1.trim().split('\n');
                for (const line of lines1) {
                    if (!line) continue;
                    const decodedString = decryptData(line, key);
                    if (decodedString) {
                        const [name, resultCode] = decodedString.split(':');
                        interviewData1.set(name, { resultCode });
                    }
                }
                const messagesText1 = await res2.text();
                const decryptedMessages1 = decryptData(messagesText1, key);
                if (decryptedMessages1) messageTemplates1 = JSON.parse(decryptedMessages1);
            }

            // Process round 2 data
            if (res3.ok && res4.ok) {
                const dataText2 = await res3.text();
                const lines2 = dataText2.trim().split('\n');
                for (const line of lines2) {
                    if (!line) continue;
                    const decodedString = decryptData(line, key);
                    if (decodedString) {
                        const [name, resultCode, group] = decodedString.split(':');
                        interviewData2.set(name, { resultCode, group });
                    }
                }
                const messagesText2 = await res4.text();
                const decryptedMessages2 = decryptData(messagesText2, key);
                if (decryptedMessages2) messageTemplates2 = JSON.parse(decryptedMessages2);
            }

        } catch (error) {
            console.error('加载或解析数据文件时出错:', error);
            displayResult('result1', '<h3>加载失败</h3><p>无法加载数据，请联系管理员。</p>', 'fail');
        }
    };

    loadAndProcessData();

    const displayResult = (elementId, message, type) => {
        const resultDiv = document.getElementById(elementId);
        if (resultDiv) {
            resultDiv.innerHTML = message;
            resultDiv.className = 'result-box';
            resultDiv.classList.add(type);
            resultDiv.classList.add('visible');
        }
    };
    
    const performSearch = () => {
        const nameToSearch = nameInput.value.trim();
        
        if (!nameToSearch) {
            displayResult('result2', '<h3>提示</h3><p>请输入一个姓名进行查询。</p>', 'not-found');
            resultDiv1.classList.remove('visible');
            return;
        }

        const result1 = interviewData1.get(nameToSearch);
        const result2 = interviewData2.get(nameToSearch);

        // If not found in any database
        if (!result1 && !result2) {
            let message = messageTemplates1['NotFound'] || "<h3>未找到</h3><p>未查询到你的面试信息，请确认姓名是否正确。</p>";
            message = message.replace(/\$\{nameToSearch\}/g, nameToSearch);
            displayResult('result2', message, 'not-found');
            resultDiv1.classList.remove('visible');
            return;
        }

        // --- Round 2 Search ---
        if (result2) {
            let message = messageTemplates2[result2.resultCode] || messageTemplates2['NotFound'];
            let resultType = 'not-found';
            if (result2.resultCode === 'P') {
                resultType = 'pass';
                message = message.replace(/\$\{group\}/g, result2.group);
            }
            if (result2.resultCode === 'F') resultType = 'fail';
            message = message.replace(/\$\{nameToSearch\}/g, nameToSearch);
            displayResult('result2', message, resultType);
        } else {
            // If there's a round 1 result, but not round 2, show "no round 2 data"
            if (result1) {
                let message = messageTemplates2['NotFound'].replace(/\$\{nameToSearch\}/g, nameToSearch);
                displayResult('result2', message, 'not-found');
            } else {
                resultDiv2.classList.remove('visible'); // Hide if no result at all
            }
        }

        // --- Round 1 Search ---
        if (result1) {
            let message = messageTemplates1[result1.resultCode] || messageTemplates1['NotFound'];
            let resultType = 'not-found';
            if (result1.resultCode === 'P') resultType = 'pass';
            if (result1.resultCode === 'F') resultType = 'fail';
            message = message.replace(/\$\{nameToSearch\}/g, nameToSearch);
            displayResult('result1', message, resultType);
        } else {
            resultDiv1.classList.remove('visible'); // Hide if no result
        }
    };

    searchButton.addEventListener('click', performSearch);
    nameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') performSearch();
    });
    nameInput.addEventListener('input', () => {
        resultDiv1.classList.remove('visible');
        resultDiv2.classList.remove('visible');
    });
});