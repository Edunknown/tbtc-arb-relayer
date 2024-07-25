import { ethers } from "ethers";

/**
 * @name getDepositId
 * @description Generates a unique deposit ID by encoding the Bitcoin funding transaction hash and output index,
 * then hashing the result using keccak256.
 *
 * @param {string} fundingTxHash - The 64-character hex string of the Bitcoin funding transaction hash.
 * @param {number} fundingOutputIndex - The index of the output in the funding transaction.
 *
 * @returns {string} A unique deposit ID as a uint256 string.
 *
 * @throws {Error} If the fundingTxHash is not a 64-character string.
 */

export const getDepositId = (fundingTxHash: string, fundingOutputIndex: number): string => {
	// Asegúrate de que fundingTxHash es una cadena de 64 caracteres hexadecimales
	if (fundingTxHash.length !== 64) {
		throw new Error("Invalid fundingTxHash");
	}

	// Convertir el fundingTxHash a un formato de bytes32 esperado por ethers.js
	const fundingTxHashBytes = "0x" + fundingTxHash;

	// Codifica los datos de manera similar a abi.encodePacked en Solidity
	const encodedData = ethers.utils.solidityPack(["bytes32", "uint32"], [fundingTxHashBytes, fundingOutputIndex]);

	// Calcula el hash keccak256
	const hash = ethers.utils.keccak256(encodedData);

	// Convierte el hash a un entero sin signo de 256 bits (uint256)
	const depositKey = ethers.BigNumber.from(hash).toString();

	return depositKey;
};
