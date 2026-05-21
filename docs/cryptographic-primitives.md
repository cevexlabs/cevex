# Cryptographic Primitives

This document provides formal definitions of the mathematical structures and hardness assumptions underlying CEVEX. It is intended for readers with a background in abstract algebra and theoretical cryptography.

---

## Notation

| Symbol | Meaning |
|--------|---------|
| $\mathbb{Z}_q$ | Integers modulo prime $q$ |
| $R = \mathbb{Z}[X] / (X^n + 1)$ | Polynomial ring |
| $R_q = \mathbb{Z}_q[X] / (X^n + 1)$ | Polynomial ring modulo $q$ |
| $R_q^{k \times l}$ | Matrix of dimensions $k \times l$ over $R_q$ |
| $\|\mathbf{v}\|_\infty$ | Infinity norm of vector $\mathbf{v}$: $\max_i |v_i|$ |
| $\|\mathbf{v}\|_2$ | Euclidean norm of vector $\mathbf{v}$ |
| $S_\eta$ | Set of polynomials with coefficients in $[-\eta, \eta]$ |
| $\mathcal{U}(S)$ | Uniform distribution over set $S$ |
| $\mathcal{B}_\gamma$ | Ball of radius $\gamma$ in infinity norm |

---

## Polynomial Ring Arithmetic

The core arithmetic of both Dilithium and FALCON takes place in polynomial rings of the form $R_q = \mathbb{Z}_q[X]/(X^n + 1)$.

**Why this ring?** The polynomial $X^n + 1$ is irreducible over $\mathbb{Z}_q$ when $n$ is a power of 2 and $q \equiv 1 \pmod{2n}$. This choice enables the Number Theoretic Transform (NTT), which performs polynomial multiplication in $O(n \log n)$ ring operations instead of $O(n^2)$.

**NTT.** For Dilithium with $n = 256$ and $q = 8380417$ (which satisfies $q \equiv 1 \pmod{512}$), the NTT maps a polynomial $f \in R_q$ to its evaluations at the $2n$-th roots of unity modulo $q$:

$$\hat{f}_i = f(\omega^{2i+1}) \pmod{q} \qquad i = 0, \ldots, n-1$$

where $\omega$ is a primitive $2n$-th root of unity modulo $q$. Polynomial multiplication in $R_q$ becomes pointwise multiplication of NTT representations:

$$\widehat{f \cdot g} = \hat{f} \circ \hat{g}$$

This is the computational backbone of all lattice operations in CEVEX.

---

## Module Lattices

A **module** over a ring $R_q$ is an algebraic structure analogous to a vector space, but over a ring rather than a field. Dilithium operates in the module $R_q^k$, whose elements are vectors of $k$ polynomials.

A **module lattice** $\Lambda$ of rank $k$ is the set of all integer linear combinations of $k$ basis vectors in $R_q^k$:

$$\Lambda = \{ \sum_{i=1}^k z_i \mathbf{b}_i : z_i \in R \}$$

The **q-ary module lattice** associated with a matrix $\mathbf{A} \in R_q^{k \times l}$ is:

$$\Lambda_q^\perp(\mathbf{A}) = \{ \mathbf{x} \in R^l : \mathbf{A}\mathbf{x} \equiv 0 \pmod{q} \}$$

$$\Lambda_q(\mathbf{A}) = \{ \mathbf{x} \in R^l : \mathbf{x} \equiv \mathbf{A}^T\mathbf{s} \pmod{q}\ \text{for some}\ \mathbf{s} \}$$

The security of Dilithium reduces to the difficulty of finding short vectors in these lattices.

---

## Hardness Assumptions

### Module Learning With Errors (Module LWE)

**Definition (Module LWE).** Let $n, k, l$ be positive integers, $q$ a prime, and $\chi$ a distribution over $R_q$. The Module LWE problem $\text{MLWE}_{n,q,k,l,\chi}$ asks:

Given polynomially many samples $(\mathbf{a}_i, b_i) \in R_q^l \times R_q$ where:
$$b_i = \langle \mathbf{a}_i, \mathbf{s} \rangle + e_i \pmod{q}$$

with fixed secret $\mathbf{s} \leftarrow \chi^l$ and fresh errors $e_i \leftarrow \chi$, distinguish these samples from uniformly random pairs in $R_q^l \times R_q$.

For Dilithium, $\chi$ is the centered binomial distribution $B_\eta$, which produces coefficients in $[-\eta, \eta]$ with probability proportional to $\binom{2\eta}{k+\eta}$ for integer $k$.

**Hardness.** No polynomial-time quantum algorithm is known to solve Module LWE. The best known quantum attacks use lattice sieving algorithms with BKZ as a subroutine. For the Dilithium-3 parameter set, these attacks require approximately $2^{162}$ quantum operations, as estimated by the Core-SVP methodology.

The Module LWE problem reduces from the standard (ring-free) LWE problem, which in turn reduces from worst-case lattice problems via a quantum reduction. This means breaking Module LWE would imply solving the shortest vector problem (SVP) in general lattices in the worst case, a problem believed to be computationally intractable.

### Module Short Integer Solution (Module SIS)

**Definition (Module SIS).** The Module SIS problem $\text{MSIS}_{n,q,k,l,\beta}$ asks:

Given a uniformly random matrix $\mathbf{A} \leftarrow \mathcal{U}(R_q^{k \times l})$, find a nonzero vector $\mathbf{z} \in R^l$ such that:

$$\mathbf{A}\mathbf{z} = 0 \pmod{q} \qquad \text{and} \qquad \|\mathbf{z}\|_\infty \leq \beta$$

**Hardness.** Module SIS is at least as hard as approximating the shortest vector problem in module lattices to within a factor of $\beta \cdot \text{poly}(n)$ in the worst case.

### Relationship Between MLWE and MSIS

Dilithium's security requires both MLWE (for the secrecy of the private key) and MSIS (for the unforgeability of signatures). Concretely:

- An adversary who can recover the secret key from the public key solves MLWE
- An adversary who can forge a signature without the secret key solves MSIS

---

## Dilithium: Formal Construction

Dilithium is an instantiation of the Fiat-Shamir with Aborts transform over module lattices. We give the formal construction for completeness.

**Parameters.** $n = 256$, $q = 8380417$, $k$ and $l$ as given in the parameter table, $\eta \in \{2, 4\}$, $\tau$ (number of nonzero coefficients in challenge), $\gamma_1$, $\gamma_2$, $\beta = \tau \cdot \eta$, $\omega$ (max hints).

**KeyGen:**

$$\rho, \rho', K \leftarrow \{0,1\}^{256}$$

$$\mathbf{A} = \text{ExpandA}(\rho) \in R_q^{k \times l}$$

$$(\mathbf{s}_1, \mathbf{s}_2) = \text{ExpandS}(\rho') \in S_\eta^l \times S_\eta^k$$

$$\mathbf{t} = \mathbf{A}\mathbf{s}_1 + \mathbf{s}_2 \in R_q^k$$

$$(\mathbf{t}_1, \mathbf{t}_0) = \text{Power2Round}_q(\mathbf{t}, d)$$

$$\text{tr} = H(\rho \| \mathbf{t}_1)$$

$$\text{pk} = (\rho, \mathbf{t}_1), \qquad \text{sk} = (\rho, K, \text{tr}, \mathbf{s}_1, \mathbf{s}_2, \mathbf{t}_0)$$

**Sign(sk, $m$):**

$$\mu = H(\text{tr} \| m)$$

$$\kappa = 0, \quad (\mathbf{z}, \mathbf{h}) = \bot$$

While $(\mathbf{z}, \mathbf{h}) = \bot$:

$$\mathbf{y} \leftarrow S_{\gamma_1 - 1}^l$$

$$\mathbf{w} = \mathbf{A}\mathbf{y}, \qquad \mathbf{w}_1 = \text{HighBits}_q(\mathbf{w}, 2\gamma_2)$$

$$\tilde{c} = H(\mu \| \mathbf{w}_1), \qquad c = \text{SampleInBall}(\tilde{c})$$

$$\mathbf{z} = \mathbf{y} + c\mathbf{s}_1$$

If $\|\mathbf{z}\|_\infty \geq \gamma_1 - \beta$ or $\|\text{LowBits}_q(\mathbf{w} - c\mathbf{s}_2, 2\gamma_2)\|_\infty \geq \gamma_2 - \beta$: $\mathbf{z} = \bot$, continue

$$\mathbf{h} = \text{MakeHint}_q(-c\mathbf{t}_0, \mathbf{w} - c\mathbf{s}_2 + c\mathbf{t}_0, 2\gamma_2)$$

If $\|\mathbf{h}\|_1 > \omega$: $\mathbf{z} = \bot$, continue

Return $\sigma = (\tilde{c}, \mathbf{z}, \mathbf{h})$

**Verify(pk, $m$, $\sigma$):**

$$\mu = H(H(\rho \| \mathbf{t}_1) \| m)$$

$$c = \text{SampleInBall}(\tilde{c})$$

$$\mathbf{w}_1' = \text{UseHint}_q(\mathbf{h}, \mathbf{A}\mathbf{z} - c\mathbf{t}_1 \cdot 2^d, 2\gamma_2)$$

Accept iff $\|\mathbf{z}\|_\infty < \gamma_1 - \beta$ and $\tilde{c} = H(\mu \| \mathbf{w}_1')$ and $\|\mathbf{h}\|_1 \leq \omega$.

**Security.** Under the MLWE and MSIS assumptions, Dilithium satisfies EU-CMA security. The reduction is tight up to the abort probability $1/\delta$, where $\delta$ is the expected number of iterations of the signing loop. For Dilithium-3, $\delta \approx 4.25$.

---

## NTRU Lattices and FALCON

FALCON's security rests on a different lattice structure: the NTRU lattice. Let $h \in R_q$ be a public polynomial. The NTRU lattice is:

$$\Lambda_q^h = \{ (u, v) \in R^2 : u + hv \equiv 0 \pmod{q} \}$$

The hardness assumption is that given $h = g/f \pmod{q}$ where $f, g$ are short, it is computationally hard to find any short vector in $\Lambda_q^h$ without knowing $f$ and $g$.

FALCON signing, reserved for the secondary path, uses the Fast Fourier Nearest Plane (FFNP) algorithm to sample from a Gaussian distribution over $\Lambda_q^h$ centered at a target point derived from $H(r \| m)$. The security of this construction relies on the fact that the Gaussian distribution over the lattice is statistically close to uniform over all possible cosets, regardless of which target point is used. An adversary observing many signatures cannot recover $f$ and $g$ from the Gaussian samples.

---

## Key Derivation Function

CEVEX uses SHAKE-256 as the key derivation function, instantiated in the XOF (extendable-output function) mode:

$$\text{sk}_\text{agent} = \text{SHAKE-256}(\text{entropy seed} \| \text{context}, 32 \cdot (l + k))$$

The context string binds the derivation to a specific agent provisioning event, preventing key reuse across different agents derived from the same entropy source.

SHAKE-256 is a member of the SHA-3 family, standardized in NIST FIPS 202. Its security against quantum adversaries relies on the preimage resistance of the Keccak permutation under Grover's algorithm, providing 128 bits of post-quantum security at 256-bit output width.

---

## Random Oracle Model

The security proofs for both Dilithium and FALCON use the Random Oracle Model (ROM), where hash functions are modeled as ideal random oracles. In practice, SHA-3/SHAKE-256 is used as a heuristic instantiation of the random oracle. The NIST selection process includes an evaluation of the security of these schemes in the Quantum Random Oracle Model (QROM), which models quantum adversaries who can make quantum superposition queries to the hash function. Both schemes have published QROM security analyses.

---

## See Also

- [Security Model](security-model.md): How these primitives translate to concrete security guarantees
- [Signatures](signatures.md): Dilithium implementation details and the FALCON release path
- [Key Generation](key-generation.md): The quantum entropy input to the KDF
